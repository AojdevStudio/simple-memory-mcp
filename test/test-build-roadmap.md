# Test Build Roadmap Command

## Command Verification Checklist

### ✅ Command Structure
- [x] YAML frontmatter with allowed tools
- [x] Clear description focused on concrete deliverables
- [x] Variables section capturing $ARGUMENTS
- [x] Core principle emphasizing commitment documents

### ✅ Quality Gates Implementation
- [x] Mandatory checks for:
  - Specific due dates (no vague timelines)
  - Named owners for each deliverable
  - Measurable success criteria
  - Explicit dependencies
  - No "TBD" items allowed
- [x] Slop detection rules to reject:
  - "Strategic thinking" language
  - "Comprehensive analysis" 
  - Multiple options without decisions
  - Vague timelines like "Q1-Q2"
  - Bullet points without owners

### ✅ Deliverable Format
- [x] Enforces concrete format with:
  - Owner field (required)
  - Due Date field (specific date required)
  - Definition of Done (acceptance criteria)
  - Dependencies (explicit mapping)
  - Risk Level with mitigation

### ✅ Templates Provided
- [x] Feature roadmap (4-12 weeks)
- [x] Technical roadmap (2-8 weeks)  
- [x] Sprint roadmap (1-4 weeks)

### ✅ Sub-agent Instructions
- [x] Force concrete decisions over analysis
- [x] Require specific dates and owners
- [x] Reject vague or aspirational language
- [x] Focus on execution over strategy
- [x] Create commitment documents, not wish lists

## Expected Behavior

When executed, this command will:

1. **Accept** roadmaps with:
   - Specific dates (e.g., "January 15, 2025")
   - Named owners (e.g., "John Smith - Backend Team")
   - Clear deliverables with done criteria
   - Concrete decisions with rejected alternatives

2. **Reject** roadmaps with:
   - Vague timelines (e.g., "Q1-Q2", "Week 1-3")
   - No ownership assigned
   - Analysis without decisions
   - Strategic frameworks without execution plans
   - Buzzword-heavy content

## Sample Output Structure

The command will generate roadmaps following this structure:

```markdown
# OAuth Implementation Roadmap

**Target:** Implement OAuth 2.0 authentication for API access
**Completion:** February 28, 2025
**Success Metric:** 100% of API endpoints secured with OAuth

## Deliverables

### OAuth Provider Integration
**Owner:** Sarah Chen - Platform Team
**Due Date:** January 31, 2025
**Definition of Done:** Successfully authenticate users via Google/GitHub OAuth
**Dependencies:** None
**Risk Level:** Medium - Mitigation: Early spike on OAuth library selection

### Token Management Service
**Owner:** Mike Rodriguez - Backend Team  
**Due Date:** February 14, 2025
**Definition of Done:** JWT tokens issued, validated, and refreshed automatically
**Dependencies:** OAuth Provider Integration
**Risk Level:** High - Mitigation: Load test token validation performance

## Timeline

[Mermaid gantt chart with specific dates]

## Key Decisions

- **Architecture:** JWT tokens over session-based auth (rejected: server sessions due to scaling)
- **Scope:** OAuth only, no SAML support in this phase
- **Resources:** 2 backend engineers full-time for 6 weeks

## Review Schedule

- January 15, 2025: OAuth provider selection review
- February 1, 2025: Integration milestone review
- February 28, 2025: Final delivery review
```

This ensures teams get actionable roadmaps they can execute against, not analysis documents.