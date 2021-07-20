import { GraphQLResolveInfo } from 'graphql';
import { plugin } from 'nexus';
import {
  ArgsValue,
  GetGen,
  MaybePromise,
  SourceValue,
} from 'nexus/dist/typegenTypeHelpers';
import { printedGenTyping, printedGenTypingImport } from 'nexus/dist/utils';

const AuthResolverImport = printedGenTypingImport({
  module: 'nexus-auth-plugin',
  bindings: ['AuthResolver'],
});

const fieldDefTypes = printedGenTyping({
  optional: true,
  name: 'withAuth',
  type: `AuthResolver<TypeName, FieldName> | boolean`,
  imports: [AuthResolverImport],
});

export type AuthResolver<TypeName extends string, FieldName extends string> = (
  root: SourceValue<TypeName>,
  args: ArgsValue<TypeName, FieldName>,
  context: GetGen<'context'>,
  info: GraphQLResolveInfo
) => MaybePromise<boolean | Error>;

export type DefaultAuthResolver = (
  root: any,
  args: any,
  context: GetGen<'context'>,
  info: GraphQLResolveInfo
) => MaybePromise<boolean>;

interface AuthPluginConfig {
  defaultAuthorize: DefaultAuthResolver;
}

export const authPlugin = ({ defaultAuthorize }: AuthPluginConfig) =>
  plugin({
    name: 'AuthPlugin',
    fieldDefTypes,
    onCreateFieldResolver: (config) => {
      return async (root, args, ctx, info, next) => {
        const withAuth = config.fieldConfig.extensions?.nexus?.config.withAuth;
        let isValid = true;

        if (!withAuth) {
          return next(root, args, ctx, info);
        }

        if (typeof withAuth === 'function') {
          isValid = withAuth(root, args, ctx, info) as boolean;
        } else {
          isValid = await defaultAuthorize(root, args, ctx, info);
        }

        if (!isValid) {
          throw new Error('Not Authorized');
        }
        return next(root, args, ctx, info);
      };
    },
  });
