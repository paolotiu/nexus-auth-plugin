import { GraphQLResolveInfo } from 'graphql';
import { ArgsValue, GetGen, MaybePromise, SourceValue } from 'nexus/dist/typegenTypeHelpers';
export declare type AuthResolver<TypeName extends string, FieldName extends string> = (root: SourceValue<TypeName>, args: ArgsValue<TypeName, FieldName>, context: GetGen<'context'>, info: GraphQLResolveInfo) => MaybePromise<boolean | Error>;
export declare type LikeAuthResolver<TypeName extends string = '', FieldName extends string = ''> = (root: SourceValue<TypeName>, args: ArgsValue<TypeName, FieldName>, context: GetGen<'context'>, info: GraphQLResolveInfo) => MaybePromise<boolean | Error>;
export declare type DefaultAuthResolver = (root: any, args: any, context: GetGen<'context'>, info: GraphQLResolveInfo) => MaybePromise<boolean>;
interface AuthPluginConfig {
    defaultAuthorize: DefaultAuthResolver;
}
export declare const authPlugin: ({ defaultAuthorize }: AuthPluginConfig) => import("nexus/dist/plugin").NexusPlugin;
export {};
