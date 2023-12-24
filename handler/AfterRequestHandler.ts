import Exchange from "../Exchange";

export type AfterRequestHandler = (exchange: Exchange, response: any) => any