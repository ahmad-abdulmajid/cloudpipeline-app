# ADR-003: Local Terraform State vs. Remote S3 State

**Status:** Accepted for the portfolio prototype; migration deferred  
**Project:** CloudPipeline  
**Date:** October 2026

## Context

Terraform requires a state file to track the AWS resources it manages.

CloudPipeline is developed by one person, using Terraform locally through WSL Ubuntu.

We needed a state-management approach that would let us learn Terraform, deploy and destroy AWS resources, and minimize unnecessary infrastructure costs.

Terraform state may contain sensitive information, so it must not be committed to Git.

## Decision

Use **local Terraform state** during the initial CloudPipeline implementation.

The state file is stored locally in the Terraform infrastructure repository and excluded from version control.

Terraform commands are executed from the developer's local environment using the dedicated AWS CLI profile.

We deliberately deferred remote-state migration rather than treating local state as the recommended solution for production.

## Alternatives Considered

### Amazon S3 Remote Backend

**Advantages:**
- Centralized state storage.
- Supports team collaboration and remote infrastructure workflows.
- Can use encryption, bucket versioning, restricted IAM access, and state locking.

**Disadvantages:**
- Requires an additional S3 bucket and backend configuration.
- Requires a bootstrap process because Terraform needs the backend before using it.
- Adds IAM, cost, and configuration considerations.

### Terraform Cloud / HCP Terraform

**Advantages:**
- Managed remote state and collaboration features.
- Supports centralized infrastructure workflows.

**Disadvantages:**
- Introduces another platform and workflow.
- Adds complexity beyond the initial learning objectives.

## Consequences

### Positive

- Simple initial Terraform setup.
- No separate remote-state infrastructure required.
- Easier to understand state behavior during early experimentation.
- Suitable for a single-developer learning environment.

### Negative

- Local state can be lost if the development environment is damaged.
- Collaboration is difficult.
- No shared locking mechanism protects against concurrent operations.
- Terraform must be run from the environment containing the correct state.
- Extra care is required to protect state from accidental disclosure.

## Security Considerations

The following files and directories must remain excluded from version control:

```gitignore
.env
.env.*
*.tfstate
*.tfstate.*
.terraform/
*.tfvars
*.tfvars.json
```

Terraform state must never be pasted into public documentation or committed to Git.

AWS credentials must not be stored in Terraform source files.

## Future Improvement

Migrate Terraform state to an encrypted S3 backend with versioning, least-privilege IAM access, and supported state locking.

Create the S3 backend infrastructure first, configure the backend, and migrate the existing local state using Terraform's supported migration procedure.

For current Terraform versions, S3 native state locking should be evaluated instead of introducing DynamoDB locking solely because older tutorials recommend it.

## Outcome

Local state was sufficient for building and testing CloudPipeline's Terraform-managed AWS infrastructure.

The project successfully created ECS, ECR, IAM, networking, and CloudWatch resources.

Remote state remains a documented improvement rather than an implemented feature.
