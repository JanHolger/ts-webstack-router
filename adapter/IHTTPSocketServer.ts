import { IHTTPSocketHandler } from "./IHTTPSocketHandler";

export default interface IHTTPSocketServer {

    setPort(port: number): void;
    getPort(): number;
    start(): Promise<void>;
    stop(): Promise<void>;
    setHandler(handler: IHTTPSocketHandler);

}