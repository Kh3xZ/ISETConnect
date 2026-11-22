# IsetConnect – REST API

Base URL: `http://localhost:8080/api`
Auth: `Authorization: Bearer <token>` on everything except `/auth/*` and `/health`.
Pagination: `?page=0&size=20` (max 50). Page responses: `{content, page, size, totalElements, totalPages, last}`.
Errors: `{timestamp, status, error, message, fieldErrors}`.

## Roles
| Role | Can |
|------|-----|
| STUDENT | register publicly, post, comment, create/join communities, read & download resources |
| PROF | everything a student can + create/edit/delete study resources |
| ADMIN | everything a prof can + manage users, moderate any post/comment/community |

(Admin extends Prof, exactly like the class diagram.) A default admin is created at startup
from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (see `.env.example`).

## User fields
Every user response contains `department`, `departmentLabel`, and for students `classe` (e.g. `L2-DSI3`)
and `level` (`L1`, `L2`, `L3`, `MP1`, `MP2`; null for special classes such as ERASMUS or OACA_*).
Authors embedded in posts/comments carry `department`, `classe` and `level` too.

## Database tables (created automatically by Hibernate)
`users`, `students`, `profs`, `admins`, `communities`, `public_communities`, `private_communities`,
`community_members`, `publications`, `comments`, `study_resources`

## Endpoints

### Meta (public)
| Method | Path | Notes |
|---|---|---|
| GET | /meta/departments | `[{code, label, classes:[...]}]` – fills the signup dropdowns (department, then its classes) |

Department codes: `GENIE_CIVIL`, `GENIE_ELECTRIQUE`, `GENIE_MECANIQUE`, `GESTION`, `TECHNOLOGIES_INFORMATIQUE`.
The class lists live in `util/ClassCatalog.java`.

### Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | /auth/register | `{nomPrenom,email,password,department,classe}` | creates a STUDENT, returns token. `classe` must belong to `department` (400 otherwise) |
| POST | /auth/login | `{email,password}` | returns `{token, tokenType, user}` |

### Users
| Method | Path | Notes |
|---|---|---|
| GET | /users/me | current user |
| PUT | /users/me | `{nomPrenom?, password?, classe?}` – students change `classe` each year (must stay in their department) |
| GET | /users?q=&department= | search by name/email, optional department filter |
| GET | /users/{id} | |
| GET | /users/{id}/publications | posts of a user (only ones you may see) |

### Admin (ROLE_ADMIN)
| Method | Path | Notes |
|---|---|---|
| GET | /admin/users?q=&department= | |
| POST | /admin/users | `{nomPrenom,email,password,role,department?,classe?}` – STUDENT needs department+classe, PROF needs department, ADMIN neither |
| DELETE | /admin/users/{id} | cascades to the user's posts, comments, memberships |

### Publications & comments
| Method | Path | Notes |
|---|---|---|
| GET | /publications?communityId= | home feed (general + public + your private communities) |
| POST | /publications | `{title,content,communityId?}` – must be a member of the community |
| GET | /publications/{id} | |
| POST | /publications/{id}/like | Like a publication; returns `{liked,likesCount}` |
| DELETE | /publications/{id}/like | Remove your like; returns `{liked,likesCount}` |
| PUT | /publications/{id} | author / admin |
| DELETE | /publications/{id} | author / admin / community owner |
| GET | /publications/{id}/comments | oldest first |
| POST | /publications/{id}/comments | `{content}` |
| PUT | /comments/{id} | author only |
| DELETE | /comments/{id} | author / post author / admin |

### Communities
| Method | Path | Notes |
|---|---|---|
| GET | /communities?q= | public + private (key never returned) |
| GET | /communities/mine | |
| POST | /communities | public: `{name,description?}` — private: `{name,description?,isPrivate:true,key,nbMax}` |
| GET | /communities/{id} | |
| PUT | /communities/{id} | owner / admin |
| DELETE | /communities/{id} | owner / admin |
| POST | /communities/{id}/join | private: `{"key":"..."}`; fails if wrong key or full (nbMax) |
| POST | /communities/{id}/leave | owner cannot leave |
| GET | /communities/{id}/members | private: members only |

### Study resources
| Method | Path | Notes |
|---|---|---|
| GET | /resources?module=&q= | any logged-in user |
| GET | /resources/modules | distinct module names (for a filter dropdown) |
| GET | /resources/{id} | |
| GET | /resources/{id}/download | file download (needs the Bearer token) |
| POST | /resources | PROF/ADMIN, `multipart/form-data`: title, description, module, file |
| PUT | /resources/{id} | PROF/ADMIN, JSON `{title,description,module}` |
| POST | /resources/{id}/attachment | PROF/ADMIN, multipart `file` – replaces the file |
| DELETE | /resources/{id} | uploader / admin |

## Quick test with curl
```bash
# 1. register + keep the token
curl -s -X POST localhost:8080/api/auth/register -H 'Content-Type: application/json' \
  -d '{"nomPrenom":"Ali Ben Salah","email":"ali@iset.tn","password":"secret123","department":"TECHNOLOGIES_INFORMATIQUE","classe":"L2-DSI3"}'

# 2. login as the default admin
curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@isetconnect.local","password":"Admin@12345"}'

TOKEN=...paste token here...

# 3. create a post, read the feed
curl -s -X POST localhost:8080/api/publications -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"Hello","content":"First post!"}'
curl -s localhost:8080/api/publications -H "Authorization: Bearer $TOKEN"

# 4. private community
curl -s -X POST localhost:8080/api/communities -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"GL2 Promo","isPrivate":true,"key":"gl2-2026","nbMax":40}'

# 5. admin creates a prof, prof uploads a PDF
curl -s -X POST localhost:8080/api/admin/users -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"nomPrenom":"Mme Trabelsi","email":"trabelsi@iset.tn","password":"prof1234","role":"PROF","department":"TECHNOLOGIES_INFORMATIQUE"}'
curl -s -X POST localhost:8080/api/resources -H "Authorization: Bearer $PROF_TOKEN" \
  -F title="Java course" -F module="Java" -F file=@cours.pdf
```
