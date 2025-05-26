---
description:
globs:
alwaysApply: false
---
# Prisma Type Safety Patterns

## Custom Type Creation

- **Type Validator Pattern:**
  ```typescript
  /** Type value for a message including relations. */
  const MESSAGE_WITH_RELATIONS = Prisma.validator<Prisma.MessageDefaultArgs>()({
    include: {
      chat: true,
      from: true,
      replyToMessage: {
        include: {
          from: true,
        },
      },
    },
  });

  /** Message including relations. */
  export type MessageWithRelations = Prisma.MessageGetPayload<
    typeof MESSAGE_WITH_RELATIONS
  >;
  ```

- **Type Definition Guidelines:**
  - Use descriptive constant names in SCREAMING_SNAKE_CASE
  - Add JSDoc comments for both validator and type
  - Export types for use across the application
  - Group related types in dedicated `Types.ts` files

## Repository Type Patterns

- **Include Relations Strategically:**
  ```typescript
  // ✅ DO: Include only needed relations
  include: {
    from: true,
    toolMessages: true,
  }

  // ❌ DON'T: Include unnecessary deep relations
  include: {
    from: {
      include: {
        messages: {
          include: {
            chat: true,
            // ... deep nesting
          }
        }
      }
    }
  }
  ```

- **Conditional Type Usage:**
  ```typescript
  // Use intersection types for additional constraints
  export type TelegramMessage = Message & HasTelegramMessageId;
  
  // Create constraint types for specific requirements
  type HasTelegramMessageId = {
    telegramMessageId: NonNullable<Message['telegramMessageId']>;
  };
  ```

## Schema Design Patterns

- **Relation Definitions:**
  ```prisma
  model Message {
    id                      Int                      @id @default(autoincrement())
    // ... other fields
    replyToMessage          Message?                 @relation("ReplyToMessage", fields: [replyToMessageId], references: [id])
    replyToMessageId        Int?
    replies                 Message[]                @relation("ReplyToMessage")
    toolCallMessages        Message[]                @relation("MessageAfterToolCalls")
    
    @@unique([telegramMessageId, chatId])
  }
  ```

- **Many-to-Many Relations:**
  ```prisma
  model PokemonCard {
    owners   User[]
  }
  
  model User {
    ownedPokemonCards PokemonCard[]
  }
  ```

## Query Optimization Patterns

- **Selective Field Loading:**
  ```typescript
  // ✅ DO: Use select for specific fields when you don't need full objects
  const users = await prisma.user.findMany({
    select: { id: true, firstName: true },
    where: { isBot: false }
  });

  // ✅ DO: Use include for relations you need
  const messages = await prisma.message.findMany({
    include: { from: true, toolMessages: true },
    where: { chatId }
  });
  ```

- **Efficient Filtering:**
  ```typescript
  // ✅ DO: Use proper where conditions
  where: {
    owners: filters.ownershipFilter === 'owned' 
      ? { some: { id: userId } }
      : { none: { id: userId } }
  }
  ```

## Migration Best Practices

- **Foreign Key Constraints:**
  ```sql
  CONSTRAINT "Message_replyToMessageId_fkey" 
  FOREIGN KEY ("replyToMessageId") REFERENCES "Message" ("id") 
  ON DELETE SET NULL ON UPDATE CASCADE
  ```

- **Index Creation:**
  ```sql
  CREATE UNIQUE INDEX "Message_telegramMessageId_chatId_key" 
  ON "Message"("telegramMessageId", "chatId");
  ```

- **Composite Keys:**
  ```prisma
  @@id([messageId, userId], name: "id")
  @@unique([setId, number])
  ```

## Error Handling Patterns

- **Repository Error Wrapping:**
  ```typescript
  try {
    return await this.prisma.pokemonCard.findMany({
      where: conditions,
      include: { set: true, boosters: true }
    });
  } catch (error) {
    throw new PokemonTcgPocketDatabaseError(
      'search_files',
      'cards', 
      this.formatError(error)
    );
  }
  ```

## Type Organization

- **File Structure:**
  - Main types in `src/Repositories/Types.ts`
  - Domain-specific types in `src/[Domain]/Repositories/Types.ts`
  - Keep types close to their usage when domain-specific

- **Export Strategy:**
  ```typescript
  // Export types from the service file they belong to
  export type { MessageWithRelations } from './Repositories/Types.js';
  
  // Exception: Expanded Prisma types go in dedicated Types.ts files
  ```

## Common Anti-Patterns

- ❌ **DON'T:** Use `any` type with Prisma operations
- ❌ **DON'T:** Create overly complex nested includes
- ❌ **DON'T:** Ignore unique constraints in schema design
- ❌ **DON'T:** Skip error handling in repository methods

- ✅ **DO:** Use Prisma's generated types
- ✅ **DO:** Create custom types for complex queries
- ✅ **DO:** Handle database errors gracefully
- ✅ **DO:** Use proper relation naming conventions
