import { GraphQLResolveInfo } from 'graphql';
import { plugin } from 'nexus';
import { ArgsValue, GetGen, MaybePromise, SourceValue } from 'nexus/dist/typegenTypeHelpers';
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

export type LikeAuthResolver<TypeName extends string = '', FieldName extends string = ''> = (
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
  formatError?: (authConfig: AuthPluginErrorConfig) => Error;
}

interface AuthPluginErrorConfig {
  error: Error;
  root: any;
  args: any;
  ctx: GetGen<'context'>;
  info: GraphQLResolveInfo;
}

export const defaultFormatError = ({ error }: AuthPluginErrorConfig): Error => {
  const err: Error & { originalError?: Error } = new Error('Not authorized');
  err.originalError = error;
  return err;
};

export const authPlugin = ({
  defaultAuthorize,
  formatError = defaultFormatError,
}: AuthPluginConfig) => {
  const ensureError =
    (root: any, args: any, ctx: GetGen<'context'>, info: GraphQLResolveInfo) => (error: Error) => {
      const finalErr = formatError({ error, root, args, ctx, info });
      if (finalErr instanceof Error) {
        throw finalErr;
      }
      console.error(
        `Non-Error value ${finalErr} returned from custom formatError in authorize plugin`
      );
      throw new Error('Not authorized');
    };

  return plugin({
    name: 'AuthPlugin',
    fieldDefTypes,
    onCreateFieldResolver: (config) => {
      const withAuth = config.fieldConfig.extensions?.nexus?.config.withAuth as LikeAuthResolver;

      if (!withAuth) {
        return;
      }

      // If it does have this field, but it's not a function, it's wrong - let's provide a warning
      if (typeof withAuth !== 'function' && typeof withAuth !== 'boolean') {
        console.error(
          new Error(
            `The authorize property provided to ${config.fieldConfig.name} with type ${
              config.fieldConfig.type
            } should be a function or a boolean, saw ${typeof withAuth}`
          )
        );
        return;
      }

      // Wrapping resolver
      return (root, args, ctx, info, next) => {
        let toComplete;

        try {
          toComplete = withAuth
            ? withAuth(root, args, ctx, info)
            : defaultAuthorize(root, args, ctx, info);
        } catch (e) {
          toComplete = Promise.reject(e);
        }

        return plugin.completeValue(
          toComplete,
          (authResult) => {
            if (authResult === true) {
              return next(root, args, ctx, info);
            }
            const finalFormatError = ensureError(root, args, ctx, info);

            if (authResult instanceof Error) {
              finalFormatError(authResult);
            }

            if (authResult === false) {
              finalFormatError(new Error('Not authorized'));
            }
            const {
              fieldName,
              parentType: { name: parentTypeName },
            } = info;

            finalFormatError(
              new Error(
                `Nexus authorize for ${parentTypeName}.${fieldName} Expected a boolean or Error, saw ${authResult}`
              )
            );
          },
          (err) => {
            ensureError(root, args, ctx, info)(err);
          }
        );
      };
    },
  });
};
