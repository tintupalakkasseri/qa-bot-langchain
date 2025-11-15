/**
 * User Story Domain Dictionaries
 * Abbreviations and Synonyms for Query Preprocessing
 */

// User Story and Agile Abbreviations
export const abbreviationMap: Record<string, string> = {
  // User Story IDs
  "us": "user story",
  "story": "user story",
  
  // Agile/Scrum
  "sprint": "sprint",
  "epic": "epic",
  "ac": "acceptance criteria",
  "po": "product owner",
  "sm": "scrum master",
  "dev": "developer",
  
  // Technical
  "api": "application programming interface",
  "ui": "user interface",
  "ux": "user experience",
  "db": "database",
  "sql": "structured query language",
  "http": "hypertext transfer protocol",
  "rest": "representational state transfer",
  "json": "javascript object notation",
  "xml": "extensible markup language",
  
  // Authentication/Security
  "otp": "one time password",
  "pwd": "password",
  "2fa": "two factor authentication",
  "auth": "authentication",
  "jwt": "json web token",
  
  // Common Actions
  "crud": "create read update delete",
  "add": "add",
  "edit": "edit",
  "del": "delete",
  "upd": "update",
  
  // Status
  "todo": "to do",
  "wip": "work in progress",
  "done": "done",
  "blocked": "blocked",
  
  // Testing
  "qa": "quality assurance",
  "uat": "user acceptance testing",
  "test": "test",
  
  // General
  "req": "requirement",
  "spec": "specification",
  "doc": "documentation",
  "config": "configuration",
  "env": "environment"
};

// User Story Domain Synonyms
export const synonymMap: Record<string, string[]> = {
  // Person/Role
  "user": ["customer", "client", "end user", "person", "individual"],
  "admin": ["administrator", "system admin", "super user"],
  "developer": ["dev", "programmer", "coder", "engineer"],
  
  // Actions - Create/Add
  "create": ["add", "insert", "register", "new", "setup", "initiate", "build"],
  "register": ["signup", "enroll", "create", "add", "sign up"],
  "add": ["create", "insert", "append", "include", "new"],
  
  // Actions - Update/Modify
  "update": ["modify", "edit", "change", "revise", "alter", "adjust"],
  "modify": ["update", "edit", "change", "alter"],
  "edit": ["update", "modify", "change", "revise"],
  
  // Actions - Delete/Remove
  "delete": ["remove", "cancel", "discard", "erase", "drop"],
  "remove": ["delete", "cancel", "discard", "eliminate"],
  "cancel": ["delete", "remove", "abort", "terminate"],
  
  // Actions - Search/Find
  "search": ["find", "lookup", "query", "retrieve", "fetch", "locate"],
  "find": ["search", "lookup", "locate", "retrieve", "discover"],
  "lookup": ["search", "find", "query", "retrieve"],
  
  // Actions - View/Display
  "view": ["display", "show", "see", "preview", "render"],
  "display": ["view", "show", "render", "present"],
  "show": ["view", "display", "present", "reveal"],
  
  // Actions - Verify/Check
  "verify": ["validate", "check", "confirm", "ensure", "test"],
  "validate": ["verify", "check", "confirm", "ensure"],
  "check": ["verify", "validate", "test", "inspect"],
  
  // Actions - Submit/Save
  "submit": ["save", "send", "post", "commit"],
  "save": ["store", "persist", "keep", "submit"],
  
  // User Story Elements
  "feature": ["functionality", "capability", "function"],
  "requirement": ["need", "specification", "requisite"],
  "acceptance criteria": ["criteria", "conditions", "requirements"],
  
  // Status/State
  "active": ["enabled", "running", "operational", "live"],
  "inactive": ["disabled", "stopped", "suspended"],
  "pending": ["waiting", "queued", "scheduled"],
  "completed": ["finished", "done", "closed", "resolved"],
  
  // Priority
  "high": ["critical", "urgent", "important"],
  "low": ["minor", "nice to have", "optional"],
  "medium": ["normal", "standard", "moderate"],
  
  // General
  "issue": ["problem", "error", "bug", "defect"],
  "error": ["issue", "problem", "failure", "bug"],
  "working": ["functioning", "operational", "running"],
  "not working": ["failing", "broken", "malfunctioning", "down"],
  
  // Data/Content
  "data": ["information", "content", "details"],
  "file": ["document", "attachment"],
  "report": ["document", "summary", "analysis"],
  
  // Authentication
  "login": ["signin", "authenticate", "access", "logon"],
  "logout": ["signout", "exit", "logoff"],
  "password": ["credential", "passphrase", "passcode"]
};

// Context-specific phrase expansions (multi-word)
export const phraseMap: Record<string, string[]> = {
  "password reset": ["forgot password", "otp reset", "credential reset", "reset password"],
  "forgot password": ["password reset", "otp reset", "credential reset"],
  "user registration": ["user signup", "user enrollment", "create account"],
  "user story": ["story", "requirement", "feature"],
  "acceptance criteria": ["criteria", "acceptance conditions"],
  "product owner": ["po", "product manager"],
  "scrum master": ["sm", "agile coach"]
};

// Stop words to preserve (context matters)
export const preservedStopWords: string[] = [
  "not", "no", "without", "unable", "cannot", "failed", "error"
];

// Common user story prefixes/patterns
export const storyPrefixes: string[] = [
  "us", "user story", "story", "feature"
];

