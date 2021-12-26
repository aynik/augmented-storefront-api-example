import express from "express"
import { graphqlHTTP } from "express-graphql"
import { introspectSchema, wrapSchema } from "@graphql-tools/wrap"
import { stitchSchemas } from "@graphql-tools/stitch"
import { print } from "graphql"
import fetch from "node-fetch"

const PORT = process.env.PORT || 4000
const SHOPIFY_STOREFRONT_API_URI = "https://arresto-momentum.myshopify.com/api/2021-10/graphql.json"
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = "5079112de091a675e3623d0d31d04ac6"

const SOCIAL_MEDIA_ACCOUNTS = {
  "Liam Fashions": [
    {
      url: "https://www.facebook.com/LiamFashions/",
      type: "FACEBOOK",
    },
    {
      url: "https://www.youtube.com/channel/Liam_Fashions",
      type: "YOUTUBE",
    },
  ],
  "Agatha Style": [
    {
      url: "https://twitter.com/Agatha-Style",
      type: "TWITTER",
    },
    {
      url: "https://www.instagram.com/agathastyle/",
      type: "INSTAGRAM",
    },
  ],
}

const schemaExecutor = (uri, headers = {}) => ({ document, variables }) => fetch(uri, {
  method: "POST", headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({ query: print(document), variables }),
}).then((res) => res.json())

const storefrontSchemaExecutor = schemaExecutor(SHOPIFY_STOREFRONT_API_URI, {
  "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN,
})

const storefrontSchema = wrapSchema({
  schema: await introspectSchema(storefrontSchemaExecutor),
  executor: storefrontSchemaExecutor,
})

const gatewaySchema = stitchSchemas({
  subschemas: [storefrontSchema],
  typeDefs: `
    enum SocialMediaType {
      FACEBOOK
      TWITTER
      INSTAGRAM
      YOUTUBE
    }

    type SocialMediaAccount {
      url: String!
      type: SocialMediaType!
    }

    type ProductCreator {
      name: String!
      socialAccounts: [SocialMediaAccount!]!
    }

    type Product {
      creator: ProductCreator
    } 
  `,
  resolvers: {
    Product: {
      creator: {
        selectionSet: '{ vendor }',
        resolve: ({ vendor }) => ({
          name: vendor,
          socialAccounts: SOCIAL_MEDIA_ACCOUNTS[vendor] ?? [],
        }) 
      }
    }
  }
})

express().use("/graphql", graphqlHTTP({
  schema: gatewaySchema,
  graphiql: true,
})).listen(PORT, () => {
  console.info(`Listening on http://localhost:${PORT}/graphql`)
})
