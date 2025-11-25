
Run these prompts in order. I allow you to make all edits. 

Prompt #1

    Trace the complete data flow in my application:
    1. What happens when a user first loads the app? (step-by-step)
    2. What happens when a user performs the main action in my app? (trace from UI click to database and back)
    3. Where does user authentication happen?
    4. Where does payment processing happen?
    5. What data is stored in the database and why?

    Show me the flow with specific file names and function names. Save this as a new markdown file called data-flow-analysis.md. Explain things simply to a brand new beginner who is on a fast track to becoming a world class engineer.


Prompt #2
    Analyze my application architecture and identify:
    1. What architectural pattern am I using? (e.g., MVC, client-server, serverless, monolith)
    2. How is my code organized? (e.g., by feature, by layer, mixed)
    3. What are the main components/modules and how do they interact?
    4. Which parts of my code handle which responsibilities? (UI, business logic, data access, authentication, payments)
    5. Are there any architectural anti-patterns or code smells I should be aware of?

    Explain in terms I can understand as a product manager learning technical concepts. Save this as a new markdown file called architecture-pattern.md

Prompt #3
    Create a comprehensive list of:
    1. All external services my app depends on (Vercel, Supabase, Stripe, etc.)
    2. All major libraries/packages and what they do
    3. All API endpoints in my backend (list each route and its purpose)
    4. All database tables and their relationships
    5. Any third-party integrations

    For each dependency, explain WHY it's needed and what would break if it failed. Save this as a new markdown file called dependency-mapping.md

Prompt #4
    Based on our analysis in code-base-analysis.md, data-flow-analysis.md, architecture-pattern.md, and dependency-mapping.md, create a visual architecture diagram for my application using Mermaid syntax.

    The diagram should show:
    1. Frontend components (user interface, forms, displays)
    2. Backend API routes and their purposes
    3. Database tables and what data they store
    4. External services (Vercel, Supabase, Stripe, etc.)
    5. Data flow arrows showing requests and responses
    6. Authentication flow
    7. Payment flow

    Use the engineering landscape diagram style with clear sections for:
    - Application Architecture (Frontend/Backend)
    - Languages & Frameworks used
    - External Services
    - Database Schema
    - Request/Response flows

    Make it detailed enough to explain to a technical interviewer.