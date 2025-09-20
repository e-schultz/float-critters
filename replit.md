# Overview

This is a Field Guide Zine application - a multi-issue digital publication focused on system design patterns and protocols. The app displays a collection of issues, each containing sections with expandable pattern entries that include signals, protocols, and detailed descriptions. It features a modern, dark-themed interface with an AI-powered chat assistant that provides context-aware help based on the current issue being viewed.

The application follows a "shacks not cathedrals" philosophy, emphasizing practical, resilient system design patterns over complex architectural approaches. Each issue serves as a comprehensive guide with cover pages, table of contents, and detailed sections covering topics like core abstractions, modular design, and other system architecture principles.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: wouter for lightweight client-side routing
- **State Management**: React hooks for local state, TanStack Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Design System**: Dark theme with custom color scheme including section-specific colors (cyan, purple, green, yellow)

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Development Setup**: Custom Vite integration for SSR during development
- **API Structure**: RESTful endpoints with `/api/` prefix
- **File Serving**: Static file serving for production builds
- **Error Handling**: Centralized error middleware with structured error responses

## Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM for schema management and migrations
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Static Data**: JSON files in `/data/` directory for issue content
- **Development Storage**: In-memory storage implementation for rapid development

## Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL storage
- **User Schema**: Simple username/password authentication model
- **Password Security**: Stored in plaintext (development setup - needs production hardening)
- **Authorization**: Basic user identification system ready for expansion

## External Service Integrations
- **AI Assistant**: Anthropic Claude integration using the latest claude-sonnet-4-20250514 model
- **AI SDK**: Vercel AI SDK v5 for streaming chat responses
- **Font Services**: Google Fonts integration (Inter, JetBrains Mono families)
- **Development Tools**: Replit-specific plugins for error overlay and development banner

## Key Architectural Decisions

**Monorepo Structure**: Single repository with shared TypeScript configurations and schemas between client and server code, enabling type safety across the full stack.

**Component-Driven UI**: Extensive use of Radix UI primitives through shadcn/ui for accessibility and consistent behavior, with custom theming through CSS variables.

**Context-Aware Chat**: AI assistant that receives packed issue context to provide relevant help, with conversation persistence per issue using localStorage.

**Progressive Enhancement**: Mobile-first responsive design with expandable sections, breadcrumb navigation, and optimized touch interactions.

**Development Experience**: Hot reload, TypeScript checking, and integrated error handling with Replit-specific tooling for cloud development.

**Data Architecture**: Hybrid approach using PostgreSQL for user data and JSON files for content, allowing rapid content updates without database migrations.