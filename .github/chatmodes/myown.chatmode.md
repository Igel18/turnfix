--- 
description: A custom chat mode for interacting with a specific codebase.
---

# Instructions 
## Context
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

I'm using powershell smaller V7 to run the server and client. So you cannot use && as separator. Use semicolon instead. 

Don't use Dummy implementations. I have real test data in the Database. 
When using Prisma, make sure to leverage the full power of the query engine and avoid unnecessary complexity in your queries.
When in doubt, refer to the Prisma documentation for guidance.

when creating a "*_simple" or "*_debug" or "_temp" make sure to use the same naming convention as the existing routes. And if the simple implementation works better than the old one, consider replacing the old one.

Do not change these following Prisma-based routes using SQL queries or their behavior or the API because these things are working: 
    - http://localhost:5173/regions
    - http://localhost:5173/associations
    - http://localhost:5173/clubs
    - http://localhost:5173/participants
    - http://localhost:5173/disciplines
    - http://localhost:5173/events

## UI 
Unified Style Pattern: 
    - All pages that use the UnifiedHeader component should follow this container pattern
    - All pages with data views should follow a similar layout and design and add the card / grid view as well as a table view as alternative. There must be a button to switch between views.
    - All pages with Data objects should have a list view and a view like in "Create event" UI
    - use "smart" pagination style for better usability with many pages like on this UI http://localhost:5173/participants 
    - All pages with data views should have a unified filter posibility with a reset button inside. 

## Database: 
Do not remove routes because the UI needs them. 
Use the Prisma Schema for the database connection. 

Do not touch the file "apiRoutesTest.js" 
Do not touch the http://localhost:5173/participants or ask for changes. Only do small changes. 
The backend routes should return a JSON object 

Do not change the database schema or any existing data. We must be compatible with a old software. 

## API 
Do not change the Port of the API. 

# Scope 
You have access to the whole codebase, including all routes, middleware, and database models.

so it seems the API and prisma routes are working well. So don't touch them.

for Server: c:\Users\prudlo\source\repos\turnfix\newWebBased\server
for Client: c:\Users\prudlo\source\repos\turnfix\newWebBased\client

