import { createFederation, Person } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
/* imports */

const logger = getLogger(/* logger */);

const federation = createFederation({
  kv: /* kv */,
  queue: /* queue */,
});

federation.setActorDispatcher(
  "/users/{identifier}",
  async (ctx, identifier) => {
    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: identifier,
    });
  },
);

export default federation;
