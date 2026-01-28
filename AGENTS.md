# PROJECT KNOWLEDGE BASE (Frontend)

**Scope:** `yudao-ui-admin-vue3/` (distinct Vue 3 + TS domain)
**Reason:** Separate from backend conventions + tooling.
**Stack:** Vue 3, Vite, TypeScript, Element Plus, Pinia.

## OVERVIEW
- Admin Dashboard (Vue 3 SPA)
- Vite build; API-driven pages; Element Plus UI components
- State via Pinia stores; auth/user data via user store helpers

## STRUCTURE
```
yudao-ui-admin-vue3/
  src/
    api/      # Services: request wrappers + endpoint functions
    views/    # Pages: route-level UI + business interactions
    store/    # Pinia: app/user/permission/cache state
```

## PATTERNS
- Main Page + Dialog
  - List/table page as “Main” (query, pagination, toolbar actions)
  - Create/Edit/Detail via Dialog (form validation + submit)
  - Dialog emits success -> Main refresh (keep query state)
- API constants
  - Centralize URL paths, enums, and option lists (avoid magic strings)
  - Reuse in views + forms (labels/value mapping)
- Store access
  - Prefer `useUserStoreWithOut()` in non-setup contexts
  - In components/setup: normal `useUserStore()` (if available in codebase)

## COMPONENTS
- **Table**: Use `v-table` or Element Plus `el-table` with pagination.
- **Form**: Use `el-form` with `rules` for validation.
- **Dialog**: Wrap forms in `el-dialog` for CRUD operations.
- **Icons**: Use `Icon` component or `el-icon`.

## COMMON TASKS
### 1. Adding a new Page
1. Create view in `src/views/xxx/index.vue`.
2. Define API in `src/api/xxx/index.ts`.
3. Add route in `src/router/modules/xxx.ts` (or via DB menu).

### 2. Using Dicts
1. Import `getDictOptions` from `@/utils/dict`.
2. Use in template:
   ```vue
   <el-select v-model="formData.status">
     <el-option v-for="dict in getDictOptions(DICT_TYPE.SYS_COMMON_STATUS)" :key="dict.value" :label="dict.label" :value="dict.value" />
   </el-select>
   ```

## ANTI-PATTERNS
- No spaces in class names (CSS selectors + utility class composition)
- No direct axios calls in views/components
  - Use `src/api/*` wrapper/services for all HTTP
  - Keep request config/auth headers centralized

## STATE MANAGEMENT
- **User Store**: `useUserStore()` for user info, roles, and permissions.
- **App Store**: `useAppStore()` for layout, theme, and sidebar state.
- **Dict Store**: `useDictStore()` for caching dictionary data.

## QUICK RULES
- Views call API services; services do not import views
- Keep form model + rules colocated with dialog component
- Keep types near API modules when they match backend VO/DTO
