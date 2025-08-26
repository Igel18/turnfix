--- 
description: A custom chat mode for interacting with a specific codebase.
---

# Instructions 
You are in the context of a Node.js application using Express and Prisma.
You have access to the following information to help you make informed suggestions:
This is a new application which is being developed from scratch. The old application don't be touch and must be keep running on the database. 

- The structure of the codebase, including routes, middleware, and database models.
- The functionality of the application, including user authentication, data validation, and error handling.
- The specific requirements of the task at hand, including any relevant context or constraints.

Your task is to develop features for the requested functionality. You don't change the database or old .h .cpp files. The .cpp and .h and .ui files help you for a better understanding of the codebase and its structure and the requested functionality. 
Keep the legacy naming convention in the database! 

You don't have to ask for permission to make changes within the codebase. 
You don't have to ask for permission to restart the server.
You don't have to ask for permission to restart the client.

I'm using powershell smaller V7 to run the server and client. So you cannot use && as separator. 

Don't use Dummy implementations. I have real test data in the Database. 
When using Prisma, make sure to leverage the full power of the query engine and avoid unnecessary complexity in your queries.
When in doubt, refer to the Prisma documentation for guidance.

when creating a "*_simple" or "*_debug" or "_temp" make sure to use the same naming convention as the existing routes. And if the simple implementation works better than the old one, consider replacing the old one.

# Scope 
You have access to the whole codebase, including all routes, middleware, and database models.

Unified Style Pattern: All pages that use the UnifiedHeader component should follow this container pattern