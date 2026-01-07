# Releasing Rating Sync

## Prereqs

- You have push access to the GitHub repo.
- GitHub Actions is enabled.

## Steps

1. Decide the next version using SemVer (`MAJOR.MINOR.PATCH`).
2. Update version in `RatingSync.csproj`.
3. Update `CHANGELOG.md`.
4. Commit.
5. Create and push a tag:

```powershell
git tag vX.Y.Z
git push origin vX.Y.Z
```

### Beta / prerelease tags

For beta builds, use a SemVer prerelease tag:

```powershell
git tag vX.Y.Z-beta.1
git push origin vX.Y.Z-beta.1
```

GitHub Actions will build and publish a GitHub Release with:
- `RatingSync.dll`
- `RatingSync-vX.Y.Z.zip`

## Notes

- The workflow uses the tag name as the version. Use tags like `v1.2.3`.
- `bin/` and `obj/` are ignored and should not be committed.
