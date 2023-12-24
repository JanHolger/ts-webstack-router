import Exchange from "../Exchange";
import { Annotation } from "./annotations";

export type RouteAutoInjector = (exchange: Exchange, annotations: Annotation[], type: any) => any;