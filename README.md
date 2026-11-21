# wserf — установка (один раз, бесплатно)
Все файлы лежат в одной папке, без вложенных папок.
1. supabase.com → New project.
2. Откройте schema.sql, замените ЗАМЕНИТЕ@НА-СВОЮ.ПОЧТУ на свою почту, вставьте весь текст в Supabase → SQL Editor → Run.
3. Supabase → Authentication → Providers → Email → выключите «Confirm email».
4. Supabase → Project Settings → API: Project URL и anon public key вставьте в config.js (service_role НЕ вставлять).
5. GitHub → новый репозиторий → Add file → Upload files → выберите ВСЕ файлы (кроме schema.sql и README.md, они не нужны на сайте) → Commit. Затем Settings → Pages → Deploy from branch → main / root.
6. Supabase → Authentication → URL Configuration: Site URL = адрес вашего сайта на GitHub Pages.
7. Зарегистрируйтесь на сайте с почтой из пункта 2 — в шапке появится «Управление».
