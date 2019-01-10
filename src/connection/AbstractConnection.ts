import Message from '../Message'
import JID from '../JID'
import { IJID } from '../JID.interface'
import * as NS from './xmpp/namespace'
import Log from '../util/Log'
import { Strophe, $iq, $msg, $pres } from '../vendor/Strophe'
import Account from '../Account'
import Pipe from '../util/Pipe'
import PEPService from './services/PEP'
import MUCService from './services/MUC'
import RosterService from './services/Roster'
import VcardService from './services/Vcard'
import DiscoService from './services/Disco'
import { IMessage } from '@src/Message.interface';
import Vcard from "@connection/services/Vcard";
import contact from "@ui/dialogs/contact";
import PersistentMap from "@util/PersistentMap";

export const STANZA_KEY = 'stanza';
export const STANZA_IQ_KEY = 'stanzaIQ';
export const STANZA_JINGLE_KEY = 'stanzaJingle';

enum Presence {
   online,
   chat,
   away,
   xa,
   dnd,
   offline
}

abstract class AbstractConnection {
   protected abstract connection;

   protected abstract send(stanzaElement: Element);
   protected abstract send(stanzaElement: Strophe.Builder);

   protected abstract sendIQ(stanzaElement: Element): Promise<Element>;
   protected abstract sendIQ(stanzaElement: Strophe.Builder): Promise<Element>;

   public abstract registerHandler(handler: (stanza: string) => boolean, ns?: string, name?: string, type?: string, id?: string, from?: string);

   protected jingleHandler;
   public abstract getJingleHandler();

   protected node = 'https://jsxc.org';

   protected services = { pubSub: null, pep: null };

   constructor(protected account: Account) {

      let discoInfo = this.account.getDiscoInfo();

      discoInfo.addIdentity('client', 'web', 'JSXC');

      NS.register('VCARD', 'vcard-temp');
      NS.register('FORWARD', 'urn:xmpp:forward:0');
   }

   public getPEPService = (): PEPService => {
      return this.getService('pep', PEPService);
   }

   public getMUCService = (): MUCService => {
      return this.getService('roster', MUCService);
   }

   public getRosterService = (): RosterService => {
      return this.getService('roster', RosterService);
   }

   public getVcardService = (): VcardService => {
      return this.getService('vcard', VcardService);
   }

   public getDiscoService = (): DiscoService => {
      return this.getService('disco', DiscoService);
   }

   private getService(key: string, Service) {
      if (!this.services[key]) {
         let self = this;

         this.services[key] = new Service(function() {
            return self.send.apply(self, arguments)
         }, function() {
            return self.sendIQ.apply(self, arguments)
         }, this, this.account);
      }

      return this.services[key];
   }

   public pluginOnlySend(stanzaElement: Element);
   public pluginOnlySend(stanzaElement: Strophe.Builder);
   public pluginOnlySend(stanzaElement) {
      this.send(stanzaElement);
   }

   public pluginOnlySendIQ(stanzaElement: Element): Promise<Element>;
   public pluginOnlySendIQ(stanzaElement: Strophe.Builder): Promise<Element>;
   public pluginOnlySendIQ(stanzaElement) {
      return this.sendIQ(stanzaElement);
   }

   public getJID(): JID {
      return this.account.getJID();
   }

   public sendMessage(message: Message) {
      if (message.getDirection() !== Message.DIRECTION.OUT) {
         return;
      }

      let xmlMsg = $msg({
         to: message.getPeer().full,
         type: message.getType(),
         id: message.getAttrId()
      });

      let htmlMessage = this.getMessage(message, message.getEncryptedHtmlMessage, message.getHtmlMessage);

      if (htmlMessage) {
         xmlMsg.c('html', {
            xmlns: Strophe.NS.XHTML_IM
         }).c('body', {
            xmlns: Strophe.NS.XHTML
         }).h(htmlMessage).up().up();
      }

      let plaintextMessage = this.getMessage(message, message.getEncryptedPlaintextMessage, message.getPlaintextMessage);

      if (plaintextMessage) {
         xmlMsg.c('body').t(plaintextMessage).up();
      }

      xmlMsg.c('origin-id', {
         xmlns: 'urn:xmpp:sid:0',
         id: message.getUid()
      }).up();

      let pipe = this.account.getPipe('preSendMessageStanza');
      pipe.run(message, xmlMsg).then(([message, xmlMsg]) => {
         if (message.hasAttachment() && !message.getAttachment().isProcessed()) {
            Log.warn('Attachment was not processed');

            message.setErrorMessage('Attachment was not processed')
         }

         this.send(xmlMsg);
      }).catch(err => {
         Log.warn('Error during preSendMessageStanza pipe:', err);
      });
   }

   private getMessage(message: Message, getEncryptedMessage: () => string, getMessage: () => string) {
      if (message.isEncrypted() && getEncryptedMessage.call(message)) {
         return getEncryptedMessage.call(message);
      } else if (getMessage.call(message)) {
         if (!message.isEncrypted()) {
            return getMessage.call(message);
         }

         Log.warn('This message should be encrypted');
      }
   }

   public sendPresence(presence?: Presence) {
      var presenceStanza = $pres();

      presenceStanza.c('c', this.generateCapsAttributes()).up();

      if (typeof presence !== 'undefined' && presence !== Presence.online) {
         presenceStanza.c('show').t(Presence[presence]).up();
      }

      // var priority = Options.get('priority');
      // if (priority && typeof priority[status] !== 'undefined' && parseInt(priority[status]) !== 0) {
      //    presenceStanza.c('priority').t(priority[status]).up();
      // }

      Log.debug('Send presence', presenceStanza.toString());

      this.send(presenceStanza);
   }

   public queryArchive(archive: JID, queryId: string, beforeResultId?: string, end?: Date): Promise<Element> {
      let iq = $iq({
         type: 'set'
      });

      iq.c('query', {
         xmlns: NS.get('MAM'),
         queryid: queryId
      });

      iq.c('x', {
         xmlns: 'jabber:x:data',
         type: 'submit'
      });

      iq.c('field', {
         'var': 'FORM_TYPE',
         type: 'hidden'
      }).c('value').t(NS.get('MAM')).up().up();

      iq.c('field', {
         'var': 'with'
      }).c('value').t(archive.bare).up().up();

      if (end) {
         iq.c('field', {
            'var': 'end'
         }).c('value').t(end.toISOString()).up().up();
      }

      iq.up().c('set', {
         xmlns: 'http://jabber.org/protocol/rsm'
      }).c('max').t('20').up();

      if (typeof beforeResultId === 'string') {
         iq.c('before').t(beforeResultId);
      }

      iq.up();

      return this.sendIQ(iq);
   }

   // @ts-ignore
   // @ts-ignore
   public changeNickname(newNickname: string) {
      let iq = $iq({
         type: 'set'
      });

      this.account.getContact().getVcard().then(
         function(vCardData) {

            iq.c('vCard', {
               xmlns: NS.get('VCARD')
            });

            iq.c('FN').t(vCardData['FN']).up();
            iq.c('N').t(vCardData['N']);
            iq.c('FAMILY').t(vCardData['FAMILY']).up();
            iq.c('GIVEN').t(vCardData['GIVEN']).up();
            iq.c('MIDDLE').t(vCardData['MIDDLE']).up();
            iq.c('PREFIX').t(vCardData['PREFIX']).up();
            iq.c('SUFFIX').t(vCardData['SUFFIX']).up();
            iq.up();
            iq.c('EMAIL').t(vCardData['EMAIL']);
            iq.c('INTERNET').t(vCardData['INTERNET']).up();
            iq.c('PREF').t(vCardData['PREF']).up();
            iq.c('USERID').t(vCardData['USERID']).up();
            iq.up();
            iq.c('TEL').t(vCardData['TEL']);
            iq.c('NUMBER').t(vCardData['NUMBER']).up();
            iq.up();
            iq.c('ADR').t(vCardData['ADR']);
            iq.c('WORK').t(vCardData['WORK']).up();
            iq.c('EXTADD').t(vCardData['EXTADD']).up();
            iq.c('STREET').t(vCardData['STREET']).up();
            iq.c('LOCALITY').t(vCardData['LOCALITY']).up();
            iq.c('REGION').t(vCardData['REGION']).up();
            iq.c('PCODE').t(vCardData['PCODE']).up();
            iq.c('CTRY').t(vCardData['CTRY']).up();
            iq.up();
            iq.c('ORGUNIT').t(vCardData['ORGUNIT']).up();
            iq.c('NICKNAME').t(newNickname).up();
         }).then(() => { return this.sendIQ(iq); });
   }

   public changePassword(newPassword: string): Promise<Element> {
      let iq = $iq({
         type: 'set'
      });

      iq.c('query', {
         xmlns: 'jabber:iq:register'
      });

      iq.c('username').t(this.getJID().node).up();

      iq.c('password').t(newPassword);

      return this.sendIQ(iq);
   }

   public close() {

   }

   protected getStorage() {
      return this.account.getSessionStorage();
   }

   private generateCapsAttributes() {
      return {
         'xmlns': NS.get('CAPS'),
         'hash': 'sha-1',
         'node': this.node,
         'ver': this.account.getDiscoInfo().getCapsVersion()
      }
   }
}

export { AbstractConnection, Presence };
