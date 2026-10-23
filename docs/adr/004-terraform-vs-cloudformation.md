# ADR-004: Terraform vs. AWS CloudFormation

**Status:** Accepted  
**Project:** CloudPipeline  
**Date:** October 2026

## Context

CloudPipeline requires several AWS resources, including:

- Amazon ECR repository
- Amazon ECS cluster, task definition, and service
- IAM roles and permissions
- CloudWatch log group
- Networking and security group

Creating these resources manually would make the infrastructure harder to reproduce and maintain.

We needed an Infrastructure as Code tool to define the infrastructure in version-controlled files.

## Decision

Use **HashiCorp Terraform** to provision and manage CloudPipeline's AWS infrastructure.

Terraform configuration is maintained in the separate `cloudpipeline-infra` repository.

The project uses Terraform to define AWS resources while GitHub Actions manages application image revisions and deployments.

Our Terraform workflow includes:

- `terraform init` to initialize providers and the working directory.
- `terraform validate` to check configuration validity.
- `terraform plan` to preview proposed infrastructure changes.
- `terraform apply` to implement approved changes.
- `terraform destroy` to remove Terraform-managed resources when appropriate.

## Alternatives Considered

### AWS CloudFormation

**Advantages:**
- Native AWS infrastructure management.
- Supports infrastructure stacks and change sets.
- Integrates with AWS IAM and other AWS services.

**Disadvantages:**
- Primarily focused on AWS.
- Uses a different configuration and stack-management model.

### Manual AWS Console Configuration

**Advantages:**
- Useful for learning and exploring AWS services.
- Convenient for simple, one-time operations.

**Disadvantages:**
- Difficult to reproduce consistently.
- More prone to manual configuration errors.
- Harder to review infrastructure changes through Git.

## Consequences

### Positive

- Infrastructure configuration is version-controlled.
- Resources can be recreated consistently.
- `terraform plan` helps identify changes before applying them.
- Terraform experience transfers to other supported cloud platforms.
- Separating application and infrastructure repositories makes their responsibilities clearer.

### Negative

- Terraform requires managing state securely.
- Provider versions and permissions require maintenance.
- Infrastructure changes can create costs or remove resources if not reviewed carefully.
- Terraform does not automatically manage application deployment revisions unless explicitly configured to do so.

## Security and Operational Considerations

- Use a dedicated AWS CLI profile for local Terraform commands.
- Do not store AWS credentials in source files.
- Exclude Terraform state and secret-containing variable files from Git.
- Review `terraform plan` before applying changes.
- Keep the ECS service's desired count at zero outside testing.
- Avoid destroying shared or persistent resources unintentionally.

## Outcome

Terraform successfully provisioned CloudPipeline's AWS infrastructure, including ECR, ECS, IAM, networking, and CloudWatch Logs.

During development, IAM permission errors helped identify the specific AWS operations Terraform required.

The final infrastructure supported Docker image deployment, container health checks, and ECS circuit-breaker rollback testing.
