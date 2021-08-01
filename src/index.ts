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

export type LikeAuthResolver<
  TypeName extends string = '',
  FieldName extends string = ''
> = (
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
        const withAuth = config.fieldConfig.extensions?.nexus?.config
          .withAuth as LikeAuthResolver;
        let isValid = true;

        if (!withAuth) {
          return next(root, args, ctx, info);
        }

        // If it does have this field, but it's not a function, it's wrong - let's provide a warning
        if (typeof withAuth !== 'function') {
          console.error(
            new Error(
              `The authorize property provided to ${
                config.fieldConfig.name
              } with type ${
                config.fieldConfig.type
              } should be a function, saw ${typeof withAuth}`
            )
          );
          return;
        }

        if (typeof withAuth === 'function') {
          isValid = (await withAuth(root, args, ctx, info)) as boolean;
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
