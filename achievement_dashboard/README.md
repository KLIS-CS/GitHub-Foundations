# KLIS-CS Developer Achievement Dashboard

This system converts trusted checkpoint evidence into a public student Developer Profile.

```text
CP evidence
→ trusted GitHub grader output
→ verified checkpoint completion
→ skill XP
→ badges
→ Developer Profile
```

## Important privacy rule

The public dashboard does **not** publish checkpoint grades. Numeric scores are read only while the workflow runs and are used to determine whether the automatic evidence requirement was completed. The generated site stores only XP, badges, verified checkpoint names, and optional display names.

## Current checkpoint mapping

| Checkpoint | Verified achievement contribution |
|---|---|
| CP1 — Repository Setup | +5 Git Workflow XP |
| CP2 — Feature Branch & PR | +5 Git Workflow XP |
| CP3 — Issues & Projects | +2 Git Workflow XP, +5 Collaboration XP |
| CP4 — Local ↔ Remote | +5 Git Workflow XP |
| CP5 — Final Integrated Challenge | +8 Git Workflow XP, +5 Debugging XP, +2 JavaScript XP |

A checkpoint contributes XP after its trusted automatic evidence reaches the full automatic requirement (`60/60`). Formal grades remain separate.

## Student discovery

Students are discovered automatically from trusted submission Issues in the KLIS-CS mother repositories for CP1, CP3, CP4, and CP5. `config/students.json` is optional and can be used to add a display name, include a student before their first central submission, or add teacher-validated manual XP later.

Example:

```json
{
  "students": [
    {
      "github": "student-login",
      "name": "Student Name",
      "enabled": true,
      "manual_xp": {
        "testing": 0,
        "hci_ui": 0
      }
    }
  ]
}
```

## CP2 note

CP2 currently grades inside the student's copied repository. The dashboard can read CP2 automatically when that repository is public, or when `GH_SCANNER_TOKEN` has read access to the private student repository. The expected repository name is `cp2-feature-branch-pr-workflow`.

## Deployment

The workflow `.github/workflows/update-achievement-dashboard.yml` runs hourly and can also be run manually. It rebuilds `docs/data.json`, then deploys `/docs` with GitHub Pages.

One-time repository setting:

**Settings → Pages → Source → GitHub Actions**

Expected public URL:

`https://klis-cs.github.io/GitHub-Foundations/`
