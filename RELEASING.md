# Releasing Rating Sync

## Prereqs

- You have push access to the GitHub repo.
- GitHub Actions is enabled.

## Recommended: bump the version and let CI publish

```powershell
./tools/bump-version.ps1 1.3.0            # or 1.3.0-beta.1
```

The script updates `<VersionPrefix>` / `<VersionSuffix>` in `RatingSync.csproj`,
adds a `## [1.3.0]` section to `CHANGELOG.md` if it is missing, commits, and
pushes to `main`.

Pushing the csproj change triggers the **Release** workflow, which:

1. reads the version from `RatingSync.csproj` and derives the tag (`v1.3.0`);
2. skips the run when that version already has a release;
3. builds in Release, runs the backend regression checks and `node --check`;
4. publishes a GitHub Release (creating the tag) with `RatingSync.dll` and
   `RatingSync-v1.3.0.zip`, using the `## [1.3.0]` section as release notes.

Edit the generated CHANGELOG section before pushing if you want real notes —
the workflow reads it at build time.

## Manual tag

Tags still work, for re-releases or releases cut from a branch:

```powershell
git tag vX.Y.Z
git push origin vX.Y.Z
```

Prerelease tags (`vX.Y.Z-beta.1`) are published as GitHub prereleases.

## Notes

- The workflow uses the tag name as the version. Use tags like `v1.2.3`.
- Pushes to `main` are cheap when nothing is left to do: the `Resolve version`
  job reads the csproj, sees the release already exists, and stops. It only
  builds when that version has no release yet, so a failed run is retried by
  the next push.
- `bin/` and `obj/` are ignored and should not be committed.
