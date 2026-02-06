/**
 * OpenAPI 3.0 spec for Deck Deals.
 * Served at GET /api-docs (Swagger UI).
 */
module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Deck Deals API",
    description: "Deck Deals — list, create, and manage playing deck listings. Server-rendered HTML; these endpoints return redirects or HTML.",
    version: "1.0.0",
  },
  servers: [
    { url: "http://localhost:4001", description: "Local" },
    { url: "/", description: "Current host" },
  ],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        description: "For load balancers and monitoring. Returns 200 when Mongo and Redis are up, 503 otherwise.",
        tags: ["Health"],
        responses: {
          200: {
            description: "Mongo and Redis are up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    mongo: { type: "string", example: "up" },
                    redis: { type: "string", example: "up" },
                  },
                },
              },
            },
          },
          503: {
            description: "Mongo and/or Redis down",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "degraded" },
                    mongo: { type: "string", example: "down" },
                    redis: { type: "string", example: "up" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/": {
      get: {
        summary: "Landing page",
        tags: ["Pages"],
        responses: { 200: { description: "HTML landing page" } },
      },
    },
    "/register": {
      get: {
        summary: "Show register form",
        tags: ["Auth"],
        responses: { 200: { description: "HTML registration form" } },
      },
      post: {
        summary: "Register a new user",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string", minLength: 5 },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          302: { description: "Redirect to /decks on success, or re-render with error" },
        },
      },
    },
    "/login": {
      get: {
        summary: "Show login form",
        tags: ["Auth"],
        responses: { 200: { description: "HTML login form" } },
      },
      post: {
        summary: "Log in",
        description: "Form-based login. Sends username and password as application/x-www-form-urlencoded. Returns 302 redirect; response body may be HTML if the client follows redirects. For session-based auth, use the login form at /login in the browser.",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string", example: "myuser" },
                  password: { type: "string", format: "password", example: "mypassword" },
                },
              },
              encoding: {
                username: { style: "form" },
                password: { style: "form" },
              },
            },
          },
        },
        responses: {
          302: {
            description: "Redirect to /decks on success, /login on failure",
            headers: {
              Location: {
                schema: { type: "string", example: "/decks" },
                description: "Redirect target",
              },
            },
          },
        },
      },
    },
    "/logout": {
      post: {
        summary: "Log out",
        tags: ["Auth"],
        responses: { 302: { description: "Redirect to /decks" } },
      },
    },
    "/decks": {
      get: {
        summary: "List all decks",
        description: "Cached (Redis). Returns HTML.",
        tags: ["Decks"],
        responses: { 200: { description: "HTML list of decks" } },
      },
      post: {
        summary: "Create a deck",
        description: "Requires authentication.",
        tags: ["Decks"],
        requestBody: {
          required: true,
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                required: ["name", "mobile", "email", "address", "price", "image", "stock"],
                properties: {
                  name: { type: "string" },
                  mobile: { type: "string" },
                  email: { type: "string", format: "email" },
                  address: { type: "string" },
                  price: { type: "number", minimum: 0 },
                  image: { type: "string", format: "uri" },
                  stock: { type: "integer", minimum: 0 },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 302: { description: "Redirect to /decks" } },
      },
    },
    "/decks/new": {
      get: {
        summary: "Show new deck form",
        tags: ["Decks"],
        responses: { 200: { description: "HTML form" } },
      },
    },
    "/decks/{id}": {
      get: {
        summary: "Show one deck",
        description: "Cached (Redis). Includes comments.",
        tags: ["Decks"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "HTML deck detail" } },
      },
      put: {
        summary: "Update a deck",
        description: "Requires ownership.",
        tags: ["Decks"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  "group[name]": { type: "string" },
                  "group[mobile]": { type: "string" },
                  "group[email]": { type: "string" },
                  "group[address]": { type: "string" },
                  "group[price]": { type: "number" },
                  "group[image]": { type: "string" },
                  "group[stock]": { type: "integer" },
                  "group[description]": { type: "string" },
                },
              },
            },
          },
        },
        responses: { 302: { description: "Redirect to /decks/{id}" } },
      },
      delete: {
        summary: "Delete a deck",
        description: "Requires ownership.",
        tags: ["Decks"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 302: { description: "Redirect to /decks" } },
      },
    },
    "/decks/{id}/edit": {
      get: {
        summary: "Show edit deck form",
        tags: ["Decks"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "HTML form" } },
      },
    },
    "/decks/{id}/comments/new": {
      get: {
        summary: "Show new comment form",
        tags: ["Comments"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "HTML form" } },
      },
    },
    "/decks/{id}/comments": {
      post: {
        summary: "Create a comment (review)",
        description: "Requires authentication.",
        tags: ["Comments"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                required: ["comment[text]"],
                properties: {
                  "comment[text]": { type: "string", maxLength: 2000 },
                },
              },
            },
          },
        },
        responses: { 302: { description: "Redirect to /decks/{id}" } },
      },
    },
    "/decks/{id}/comments/{comment_id}/edit": {
      get: {
        summary: "Show edit comment form",
        tags: ["Comments"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "comment_id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "HTML form" } },
      },
    },
    "/decks/{id}/comments/{comment_id}": {
      put: {
        summary: "Update a comment",
        description: "Requires ownership.",
        tags: ["Comments"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "comment_id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  "comment[text]": { type: "string", maxLength: 2000 },
                },
              },
            },
          },
        },
        responses: { 302: { description: "Redirect to /decks/{id}" } },
      },
      delete: {
        summary: "Delete a comment",
        description: "Requires ownership.",
        tags: ["Comments"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "comment_id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 302: { description: "Redirect to /decks/{id}" } },
      },
    },
  },
  tags: [
    { name: "Health", description: "Health check for monitoring" },
    { name: "Auth", description: "Register, login, logout" },
    { name: "Pages", description: "Landing and static pages" },
    { name: "Decks", description: "Deck listings CRUD" },
    { name: "Comments", description: "Reviews/comments on decks" },
  ],
};
