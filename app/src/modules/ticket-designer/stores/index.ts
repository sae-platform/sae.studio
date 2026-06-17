export { useTicketStore, ticketUid, resetTicketUid } from "./ticket.store";
export type {
  Align,
  FontSize,
  BlockBase,
  TextBlock,
  SeparatorBlock,
  TotalBlock,
  QrBlock,
  FeedBlock,
  ActionBlock,
  IfBlock,
  IfElseBlock,
  EachColumn,
  EachBlock,
  TicketBlock,
  TicketGroup,
  TicketNode,
} from "./ticket.store";
export { xmlToBlocks, blocksToXml, getDefaultBlocks } from "../services/ticket-xml.service";
