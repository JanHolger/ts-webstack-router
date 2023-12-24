import RouteParamTransformer from "./RouteParamTransformer";

export default interface RouteParamTransformerProvider {

    getRouteParamTransformers(): RouteParamTransformer[]
    getRouteParamTransformer(type: string): RouteParamTransformer|null

}