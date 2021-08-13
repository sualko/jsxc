import Client from '../Client';
import OTRPlugin from '../plugins/otr/Plugin';
import ReceiptPlugin from '../plugins/MessageDeliveryReceiptsPlugin';
import NotificationPlugin from '../plugins/NotificationPlugin';
import MeCommandPlugin from '../plugins/MeCommandPlugin';
import MessageArchiveManagementPlugin from '../plugins/mam/Plugin';
import ChatStatePlugin from '../plugins/chatState/ChatStatePlugin';
import HttpUploadPlugin from '../plugins/httpUpload/HttpUploadPlugin';
import AvatarVCardPlugin from '../plugins/AvatarVCardPlugin';
import BlockingCommandPlugin from '../plugins/BlockingCommandPlugin';
import CarbonsPlugin from '../plugins/MessageCarbonsPlugin';
import OMEMOPlugin from '../plugins/omemo/Plugin';
import BookmarksPlugin from '@src/plugins/bookmarks/BookmarksPlugin';
import ChatMarkersPlugin from '@src/plugins/chatMarkers/ChatMarkersPlugin';
import PingPlugin from '@src/plugins/PingPlugin';
import CommandPlugin from '@src/plugins/CommandPlugin';
import VersionPlugin from '@src/plugins/VersionPlugin';
import TimePlugin from '../plugins/TimePlugin';
import JingleMessageInitiationPlugin from '../plugins/JingleMessageInitiationPlugin';
import JingleMUCMessageInitiationPlugin from '@src/plugins/JingleMUCMessageInitiationPlugin';

Client.addPlugin(OTRPlugin);
Client.addPlugin(OMEMOPlugin);
Client.addPlugin(ReceiptPlugin);
Client.addPlugin(NotificationPlugin);
Client.addPlugin(MeCommandPlugin);
Client.addPlugin(MessageArchiveManagementPlugin);
Client.addPlugin(ChatStatePlugin);
Client.addPlugin(HttpUploadPlugin);
Client.addPlugin(AvatarVCardPlugin);
Client.addPlugin(BlockingCommandPlugin);
Client.addPlugin(CarbonsPlugin);
Client.addPlugin(BookmarksPlugin);
Client.addPlugin(ChatMarkersPlugin);
Client.addPlugin(PingPlugin);
Client.addPlugin(CommandPlugin);
Client.addPlugin(VersionPlugin);
Client.addPlugin(TimePlugin);
Client.addPlugin(JingleMessageInitiationPlugin);
Client.addPlugin(JingleMUCMessageInitiationPlugin);
