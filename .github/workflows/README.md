# GitHub Workflows for TurnFix Web

This directory contains automated workflows for building, testing, and deploying the TurnFix Web application.

## 📁 Workflow Files

### 🚀 `build-and-release.yml`
**Main build and release workflow**

**Triggers:**
- Push to `main`, `WebInterface`, `develop` branches
- Git tags starting with `v*`
- Manual dispatch with release options

**Features:**
- ✅ Multi-Node.js version testing (18.x, 20.x)
- ✅ PostgreSQL database testing
- ✅ Server, Client, and Jury Portal builds
- ✅ Test execution with coverage
- ✅ Windows setup package creation
- ✅ Automatic GitHub releases
- ✅ Docker image building
- ✅ Comprehensive artifact management

**Artifacts:**
- `turnfix-web-build-{node-version}`: Built application files
- `turnfix-web-windows-setup`: Windows installer package
- `turnfix-web-docker`: Docker image (tar format)

### 🔄 `ci.yml`
**Continuous Integration workflow**

**Triggers:**
- Pull requests to `main` or `WebInterface`
- Daily schedule (2 AM UTC)
- Manual dispatch

**Features:**
- ✅ Fast build and test validation
- ✅ Code linting and type checking
- ✅ Build size reporting
- ✅ Security scanning with Trivy
- ✅ npm audit checks

### 📦 `update-dependencies.yml`
**Dependency update automation**

**Triggers:**
- Weekly schedule (Mondays 9 AM UTC)
- Manual dispatch

**Features:**
- ✅ Automated dependency updates
- ✅ Security fix application
- ✅ Automatic pull request creation
- ✅ Dependabot integration support

### 🗄️ `database-operations.yml`
**Database backup and management**

**Triggers:**
- Daily schedule (3 AM UTC)
- Manual dispatch with options

**Features:**
- ✅ Automated database backups
- ✅ Backup validation and testing
- ✅ Migration management
- ✅ Restore testing
- ✅ Backup reporting

## 🔧 Configuration Files

### `dependabot.yml`
Configures automated dependency updates for:
- Root package dependencies
- Server dependencies
- Client dependencies
- Jury portal dependencies
- GitHub Actions versions

## 🚀 Usage Examples

### Creating a Release

#### Automatic Release (on tag push):
```bash
git tag v1.0.0
git push origin v1.0.0
```

#### Manual Release:
1. Go to **Actions** tab in GitHub
2. Select **"Build and Release TurnFix Web"**
3. Click **"Run workflow"**
4. Set `create_release` to `true`
5. Specify `release_tag` (e.g., `v1.0.0`)

### Running Tests
Tests run automatically on PRs, but you can trigger them manually:
1. Go to **Actions** tab
2. Select **"CI - Test and Build"**
3. Click **"Run workflow"**

### Database Operations
1. Go to **Actions** tab
2. Select **"Database Backup and Restore"**
3. Choose action: `backup`, `restore`, or `migrate`
4. Run workflow

## 📋 Workflow Status Badges

Add these to your README.md:

```markdown
[![Build and Release](https://github.com/Igel18/turnfix/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/Igel18/turnfix/actions/workflows/build-and-release.yml)
[![CI](https://github.com/Igel18/turnfix/actions/workflows/ci.yml/badge.svg)](https://github.com/Igel18/turnfix/actions/workflows/ci.yml)
[![Update Dependencies](https://github.com/Igel18/turnfix/actions/workflows/update-dependencies.yml/badge.svg)](https://github.com/Igel18/turnfix/actions/workflows/update-dependencies.yml)
```

## 🔒 Required Secrets

No additional secrets required - workflows use `GITHUB_TOKEN` automatically.

For enhanced functionality, you may configure:
- `DOCKER_USERNAME` and `DOCKER_PASSWORD` for Docker Hub publishing
- `SLACK_WEBHOOK` for notifications
- `DATABASE_URL` for production database operations

## 🏗️ Build Artifacts

### Linux/macOS Package (`turnfix-web-linux.tar.gz`)
```bash
# Extract and install
tar -xzf turnfix-web-linux.tar.gz
cd server
npm install --production
# Configure .env file
npm start
```

### Windows Package (`turnfix-web-setup-windows.zip`)
```powershell
# Extract ZIP file
# Run as Administrator:
.\setup.ps1
# Configure database connection
.\start-application.ps1
```

### Docker Image
```bash
# Load and run
docker load < turnfix-web-docker.tar
docker run -p 3001:3001 turnfix-web:latest
```

## 🚨 Troubleshooting

### Build Failures
1. Check Node.js version compatibility
2. Verify database connectivity
3. Review test output in Actions logs
4. Check for breaking dependency updates

### Release Issues
1. Ensure proper tagging format (`v*`)
2. Verify write permissions to repository
3. Check artifact sizes don't exceed GitHub limits

### Database Issues
1. Confirm PostgreSQL service availability
2. Verify connection strings
3. Check migration status
4. Review backup file integrity

## 📈 Monitoring

### Build Success Rate
Monitor workflow success rates in the **Actions** tab insights.

### Performance Metrics
- Build time trends
- Test execution time
- Artifact sizes
- Dependency update frequency

### Security Monitoring
- npm audit results
- Trivy scan reports
- Dependabot alerts
- Security advisory notifications

## 🔄 Maintenance

### Weekly Tasks
- Review dependency update PRs
- Check build performance
- Validate backup integrity
- Monitor security advisories

### Monthly Tasks
- Review workflow efficiency
- Update Node.js versions
- Optimize build processes
- Archive old artifacts

### Quarterly Tasks
- Review and update workflow configurations
- Security audit of build process
- Performance optimization
- Documentation updates

## 📞 Support

For workflow issues:
1. Check **Actions** tab for detailed logs
2. Review this documentation
3. Open an issue with workflow run details
4. Tag repository maintainers if urgent

---

*Last updated: $(date +"%Y-%m-%d")*
