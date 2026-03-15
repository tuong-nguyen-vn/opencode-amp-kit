# Stack: WordPress — Additional Review Checks

Injected IN ADDITION to `php` preset when WordPress signals are detected:
- `wp-config.php` in the diff
- `wp-content/` paths in the diff
- `functions.php` in a theme directory
- WordPress function calls (`add_action`, `add_filter`, `get_option`, `WP_Query`, `WP_Post`) in `.php` files

Contains WordPress-specific checks only — PHP-level checks are in `php.md`.

---

## Aspect 2 — Correctness (additional)

- `WP_Query` without `wp_reset_postdata()` after a custom loop — corrupts the global `$post` variable for any subsequent loop on the same page.
- `get_option()` return value used without checking for `false` — returns `false` when the option doesn't exist; always provide a default: `get_option('key', $default)`.
- Direct `$wpdb->query()` with `sprintf` / string concatenation — SQL injection. Use `$wpdb->prepare()` for all queries with variable input.
- `wp_die()` called in an AJAX handler without `wp_send_json_error()` — AJAX callers receive an HTML error page instead of JSON, breaking the frontend response handler.

---

## Aspect 3 — Possible Breakage (additional)

- `add_action` / `add_filter` hook registered at the wrong priority or on the wrong hook — code runs before WordPress is fully loaded or after the targeted data is already rendered; verify hook timing in the WordPress action reference.
- Plugin/theme adding `admin_enqueue_scripts` without checking `get_current_screen()` — scripts/styles enqueued on every admin page, not just the intended one.
- Direct database write bypassing WordPress APIs (raw `INSERT` into `wp_posts`) — skips post meta, cache invalidation, and hooks; use `wp_insert_post()` / `wp_update_post()`.
- Options or transients stored with `autoload = yes` for large datasets — bloats every page load's initial DB query; use `autoload = no` or custom tables for large data.

---

## Aspect 7 — Security (additional)

- Missing nonce verification on form submissions or AJAX handlers — CSRF. Add `wp_nonce_field()` in forms and `check_ajax_referer()` / `wp_verify_nonce()` in handlers.
- Missing capability check before privileged operations — `current_user_can('manage_options')` or the appropriate capability must be verified; absence allows privilege escalation.
- `echo $_POST['field']` or `echo get_query_var('x')` without escaping — XSS. Use `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses()` as appropriate.
- `$wpdb->prepare()` used with `%s` for table/column names — `prepare()` only escapes values, not identifiers; validate table/column names against an explicit allowlist.
- File upload without MIME type validation via `wp_check_filetype_and_ext()` — allows uploading unexpected file types; use WordPress upload APIs which apply type checking.
- `add_shortcode` rendering user-submitted content without `wp_kses()` — stored XSS via shortcode attributes.

---

## Aspect 10 — Code Quality (additional)

- Hardcoded database table prefix `wp_` instead of `$wpdb->prefix` — breaks multi-site installs and custom-prefix installations.
- Direct file path construction without `plugin_dir_path()` / `get_template_directory()` — breaks on non-standard WordPress setups.
- `echo` inside a function intended as a filter callback — filters should `return` the modified value, not echo it; echoed output appears before page headers.

---

## Aspect 12 — Architecture & Design (additional)

- Business logic in `functions.php` directly — for plugins and large themes, organize code into classes or separate includes; `functions.php` should only bootstrap hooks.
- Calling `the_post()` or `setup_postdata()` outside of a loop context — corrupts global post state.
- `wp_remote_get()` / `wp_remote_post()` called synchronously on page load for a third-party service — blocks page rendering if the remote service is slow or down; run via a scheduled event (`wp_cron`) or queue asynchronously.
