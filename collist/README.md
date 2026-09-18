# ColList

Навигатор по университетам со 100% финансированием для школьников 10–12 классов и тех, кто подаётся повторно после gap year.

*(English version below — [jump to it](#collist-english))*

---

## Описание решения

Почти все калькуляторы поступления отвечают на один вопрос: возьмут или не возьмут. Для студента из Центральной Азии, которому нужно полное покрытие расходов, это половина задачи. Вторая половина — заплатят ли за него, и она решается по другим правилам.

ColList считает две независимые вероятности для каждого университета. В need-blind вузе поступление и финансирование — по сути одно решение: если взяли, нужду закроют полностью. В вузе с merit-грантом это конкурс внутри конкурса, и вторая вероятность резко ниже при тех же баллах. Студент видит эту разницу на карточке, а не догадывается о ней.

Продукт устроен как один проход: анкета → диагностика текущего состояния → список из восьми университетов → дорожная карта от текущей точки к целевой → экспорт. Всё пересчитывается на лету: меняете GPA в анкете — кольцевой индикатор, восемь карточек и приоритеты действий перерисовываются сразу, без перезагрузки.

Два принципа, заложенных в логику:

- **Отсутствующий балл — не ноль.** Если SAT не сдан или студент подаётся test-optional, тесты оцениваются нейтрально (65–75 из 100), а не обнуляют профиль. Продукт рассчитан на человека, который ещё в процессе.
- **Регион влияет на порядок, но не на состав.** Выбор региона умножает ранг на 1.12. Вуз с полным финансированием никогда не исчезает из выдачи из-за географии.

---

## Стек и архитектура

Next.js 16.3.5 (App Router, Turbopack), React 19.2.8, TypeScript в строгом режиме, Tailwind CSS v4, иконки lucide-react. Одна runtime-зависимость сверх фреймворка.

Вся предметная логика вынесена в чистые функции без состояния и без React:

| Модуль | Отвечает за |
|---|---|
| `lib/diagnostic.ts` | Диагностика точки А: пять баллов 0–100 и двуязычные выводы |
| `lib/matcher.ts` | Две вероятности на вуз, бакеты Dream/Target/Safety, отбор восьми |
| `lib/roadmap.ts` | Мост от точки А к точке Б, приоритеты действий, дедлайны |
| `lib/qualitativeEvaluator.ts` | Оценка культуры кампуса, офлайн-движок для AI-проверки |
| `lib/universe.ts` | Сборка пула для матчинга из двух наборов данных |
| `lib/export.ts` | Отчёт, резервная копия профиля, сводка для консультанта |
| `lib/persistent-store.ts` | Хранилище на `useSyncExternalStore` |

Их можно импортировать и запускать вне браузера — этим и пользовались при проверке.

Состояние держат три контекста: `UserContext` (профиль абитуриента), `LanguageContext` (330 строк на язык), `SkyThemeContext` (день/ночь). Все три работают через `useSyncExternalStore` с отдельным серверным снимком — поэтому при гидратации разметка сервера и клиента совпадает, а сохранённые значения подхватываются уже после монтирования.

Тема переключается инверсией шкалы `slate` в CSS-переменных под `:root[data-sky="day"]`. Tailwind v4 компилирует утилиты в `var(--color-slate-N)`, поэтому вся тема меняется без правок в компонентах.

---

## Запуск

Нужен Node 20+ (разрабатывалось на 24.21) и npm.

```bash
npm install
cp .env.example .env.local     # ключ Gemini не обязателен
npm run dev                    # http://localhost:3000
```

Приложение полностью работоспособно без ключа: AI-проверка соответствия переключается на локальный движок и показывает это в интерфейсе.

Чтобы включить живой AI, впишите ключ в `.env.local` и **перезапустите сервер** — Next читает переменные окружения только при старте:

```
GEMINI_API_KEY=ваш_ключ        # https://aistudio.google.com/apikey
GEMINI_MODEL=                  # опционально, по умолчанию gemini-3.6-flash
```

Сборка и проверка типов:

```bash
npm run build
npm run lint
```

---

## Тестовый сценарий

Пять минут, показывает то, что отличает продукт от обычного калькулятора.

1. **«Найти университет»** в шапке. Выберите 11 класс, GPA 3.9, SAT 1500, IELTS 7.5, добавьте одну активность уровня «Олимпиады / Исследования», направление Computer Science. Нажмите «Собрать список».
2. **Диагностика** — посмотрите на индекс и раскройте «Диагностические заметки». Тексты меняются в зависимости от класса: десятикласснику советуют PSAT и траекторию, двенадцатикласснику — эссе и формы на финансовую помощь.
3. **Матрица из 8 университетов.** Обратите внимание, что два процента на карточке различаются, и сильнее всего — у вузов с merit-грантами.
4. **Уберите баллы.** «Изменить базовый профиль» → шаг 2 → «Подаюсь без тестов». Готовность по тестам не падает в ноль, она становится нейтральной. Список пересобирается на глазах.
5. **Проверьте регион.** Шаг 4 → выберите только Азию. Американские вузы остаются в выдаче, просто ниже. Это ключевое отличие: фильтра по региону здесь нет.
6. **AI-проверка соответствия** на любой карточке. Значок источника покажет, ответил Gemini или сработал офлайн-движок.
7. **Дорожная карта** — приоритетные действия с процентами. Цифры посчитаны: каждое действие прогоняется через тот же движок матчинга, и разница записывается в карточку.
8. **Экспорт стратегии** → «Печать / PDF» и «Резервная копия». JSON можно выгрузить и загрузить обратно — список соберётся идентичный.
9. **Переключите язык** в шапке на RU. Интерфейс, диагностика и стратегические тексты переводятся полностью.

---

## Роли участников

> **Заполнить перед сдачей.** Ниже — формат; реальный состав команды в этот файл не вписан.

| Участник | Роль | Зона ответственности |
|---|---|---|
| — | — | — |

---

## Источники данных

| Файл | Что внутри | Откуда |
|---|---|---|
| `data/universities.json` | 16 опорных вузов с полным описанием на двух языках | Кураторский набор. У 10 из 16 показатели поступления заменены на официальные, у 6 помечены как «Оценка» прямо на карточке |
| `data/funded-directory.json` | 74 вуза с полным покрытием обучения и проживания, 11 стран | Собрано с [Grantitude](https://www.grantitude.net/); атрибуция и дата выгрузки — в шапке файла |
| Показатели поступления | Процент зачисления, средний SAT, полная стоимость обучения | [College Scorecard](https://collegescorecard.ed.gov/), открытые данные Министерства образования США |
| `data/qualitativeData.json` | Культура кампуса по 16 вузам: пять измерений, индекс стресса, сила трудоустройства | Составлено вручную по публичным сведениям. Это редакционная оценка, а не выгрузка из источника |

В каталоге Grantitude заявлено 121 позицию; в их данных 109, и из них полное покрытие (обучение **и** проживание) дают 74. Импортированы только эти 74.

Из 55 вузов, участвующих в подборе, 49 имеют официальные показатели, 6 — оценочные и помечены.

---

## Использованные AI/API

**Google Gemini** — качественная оценка кампуса под конкретный профиль студента.

- Эндпоинт: `https://generativelanguage.googleapis.com/v1/models/{model}:generateContent`
- Модель по умолчанию: `gemini-3.6-flash`, меняется переменной `GEMINI_MODEL`
- Строгий JSON через `responseMimeType: "application/json"`, `temperature: 0.4`, таймаут 12 с
- Вызов только на сервере, в роуте `app/api/vibe-check/route.ts`

Если ключа нет, сеть недоступна, модель снята с обслуживания или у Google перегрузка — включается `lib/qualitativeEvaluator.ts` и отдаёт детерминированный результат по локальным данным. Ответ API всегда содержит поле `source`, и интерфейс показывает его честно: «Живой AI-анализ» или «Офлайн-профиль культуры».

**College Scorecard API** (`api.data.gov`) использовался разово при подготовке данных, в рантайме не вызывается.

---

## Ранее созданные компоненты

Проект написан с нуля в рамках хакатона. Не нашим кодом являются:

- шаблон `create-next-app` (базовая структура `app/`, конфиги);
- `lucide-react` — иконки;
- `public/collistlogo.png` — логотип, предоставлен автором проекта (в репозитории лежит производный `collistlogo-mark.png` с вырезанным фоном);
- `public/enhanced_stanf.png` — фотография кампуса;
- логотипы университетов в `public/logos/` — получены через favicon-сервис Google, товарные знаки принадлежат вузам;
- наборы данных из раздела «Источники данных».

Вся логика подбора, диагностики, дорожной карты и весь интерфейс написаны в ходе работы над проектом.

---

## Известные ограничения

- **26 вузов из каталога не участвуют в подборе.** По ним нет официальной статистики поступления (это неамериканские вузы, федеральных данных на них не существует). Они доступны для просмотра с реальными дедлайнами и ссылками, но не ранжируются. Это главное ограничение на сегодня.
- **6 вузов из 55 имеют оценочные показатели.** Помечены как «Оценка» в интерфейсе.
- **Порог GPA не публикуется почти нигде.** Для вузов без него вес этого критерия перераспределяется на тесты и активности, а не считается нулём.
- **Оплата не подключена.** Экран подписки — интерфейс без бэкенда: поля карты живут только в состоянии компонента, никуда не отправляются и не сохраняются, кнопка оплаты ничего не делает.
- **Четыре функции Pro пока не реализованы** — они описаны на экране подписки как план.
- **Описания программ в каталоге только на английском.** Переводить формулировки о деньгах машинно рискованно: ошибка в термине вводит в заблуждение по существу.
- **Дедлайны в дорожной карте общие** (1 ноября / 1 января), а не по каждому вузу. В каталоге дедлайны конкретные.
- **Автотестов в репозитории нет.** Как проверялось — ниже.
- **Профиль хранится только в браузере.** Учётных записей нет; перенос между устройствами — через экспорт JSON.

---

## Техническая справка

### Библиотеки и сервисы

| | |
|---|---|
| Фреймворк | Next.js 16.3.5 (App Router, Turbopack) |
| UI | React 19.2.8, TypeScript 5 (strict), Tailwind CSS v4.3.3 |
| Иконки | lucide-react |
| Шрифты | Poppins (заголовки), Manrope (интерфейс) через `next/font/google`, самохостинг |
| Внешние сервисы | Google Gemini API (рантайм), College Scorecard API (подготовка данных) |
| Хранилище | `localStorage` браузера, ключи `collist.profile`, `collist.language`, `collist.sky` |

Manrope выбран вместо Plus Jakarta Sans осознанно: у последнего нет кириллического набора, и русский интерфейс проваливался бы в системный шрифт. У Poppins кириллицы тоже нет, поэтому в стеке `--font-display` вторым идёт Manrope и подхватывает кириллические глифы.

### Методы проверки результата

- **Сборка и типы.** `npm run build` и `npm run lint` проходят без ошибок и предупреждений. TypeScript в строгом режиме; необязательные поля (`minGpa`, `avgSat`, `coaUsd`) описаны как `optional`, поэтому компилятор сам находит места, где их забыли проверить.
- **Движки проверялись изолированно.** Чистые модули из `lib/` компилировались в CommonJS и запускались в Node отдельно от React: около 200 проверок на диагностику, матчинг, дорожную карту, экспорт и миграцию профиля. Проверялись в том числе граничные случаи: GPA 0, шкала 5.0, `undefined` вместо массивов, отрицательный SAT, пустой список вузов, битый JSON в хранилище. Два падения, найденные так, исправлены (обращение к `.length` неопределённого массива в двух движках).
- **Регион как вес, а не фильтр** проверялся отдельно: при выборе «Азия» неазиатские вузы остаются в выдаче, а обе вероятности совпадают до единицы с расчётом без выбранного региона — меняется только порядок.
- **API-роут проверялся живыми запросами**: без ключа, с заведомо неверным ключом (реальный запрос к Google, отказ, переход на офлайн-движок), на всех 74 вузах, а также на некорректных телах запроса (404 / 400 / 400).
- **Двуязычность проверяется скриптом**: совпадение набора ключей, отсутствие пустых значений, отсутствие захардкоженного английского в компонентах, сходимость всех динамически собираемых ключей.
- **Миграция профиля** проверена на схеме прошлых версий: старое булево `isTestOptional` переводится в трёхзначный статус, `gpa` без указания шкалы читается как 4.0, отсутствующие массивы становятся пустыми.

Скрипты проверок писались под конкретные задачи и в репозиторий не включены — это осознанный долг, а не упущение: за отведённое время приоритет был у работающего продукта.

### Меры безопасности

- **Ключ Gemini не покидает сервер.** Вызов только из роута; в браузер уходит готовый JSON. `.env.local` в `.gitignore`, в истории репозитория ключей нет.
- **Ответ модели не доверенный.** `isValidVibeCheck()` проверяет структуру до вывода на экран: неверная форма — показывается локальный профиль, а не сломанная карточка с `undefined`.
- **Данные карты никуда не идут.** В `PricingModal` нет ни `fetch`, ни `localStorage`, ни записи в контекст; на всех полях `autoComplete="off"`; значения живут в состоянии компонента и исчезают вместе с ним.
- **Данные из хранилища проверяются полем за полем.** `reconcileProfile()` отсекает GPA вне диапазона, неизвестные классы, нестроковые значения, обрезает списки до лимитов (10 активностей, 5 наград, 150 символов описания) и игнорирует посторонние ключи. То же применяется к импорту JSON, поэтому вручную отредактированный файл не пролезет.
- **Внешние ссылки** открываются с `rel="noopener noreferrer"`.
- **Телеметрии нет.** Профиль не покидает браузер, пока пользователь сам не выгрузит его.

---
---

<a id="collist-english"></a>

# ColList (English)

A navigator for universities offering 100% funding, built for students in grades 10–12 and gap-year reapplicants.

## What it does

Most admissions calculators answer one question: will they admit me. For a Central Asian student who needs the full cost covered, that is half the problem. The other half — will they pay for me — follows different rules.

ColList computes two independent probabilities per university. At a need-blind school, admission and funding are effectively the same decision: clear the bar and demonstrated need is met in full. At a merit-scholarship school it is a competition inside a competition, and the second number drops sharply on identical scores. The student sees that difference on the card instead of guessing at it.

The product is a single pass: questionnaire → baseline diagnostic → eight-university matrix → roadmap from where you are to where you need to be → export. Everything recalculates live — change a GPA and the score ring, all eight cards and the action priorities redraw without a reload.

Two principles are built into the logic:

- **A missing score is not a zero.** No SAT yet, or applying test-optional, is scored neutrally (65–75 of 100). The product is designed for someone mid-process.
- **Region changes the order, never the pool.** Selecting a region multiplies rank by 1.12. A fully funded university is never removed because of geography.

## Stack and architecture

Next.js 16.3.5 (App Router, Turbopack), React 19.2.8, TypeScript in strict mode, Tailwind CSS v4, lucide-react icons. One runtime dependency beyond the framework itself.

All domain logic lives in pure, stateless functions with no React:

| Module | Responsibility |
|---|---|
| `lib/diagnostic.ts` | Point A baseline: five 0–100 scores plus bilingual insights |
| `lib/matcher.ts` | Dual odds per university, Dream/Target/Safety buckets, the final eight |
| `lib/roadmap.ts` | Point A→B bridge, prioritised actions, deadlines |
| `lib/qualitativeEvaluator.ts` | Campus culture scoring and the offline AI fallback |
| `lib/universe.ts` | Builds the matchable pool from both datasets |
| `lib/export.ts` | Print report, profile backup, advisor summary |
| `lib/persistent-store.ts` | `useSyncExternalStore` persistence |

They import and run outside a browser, which is how they were tested.

Three contexts hold state: `UserContext` (applicant profile), `LanguageContext` (330 strings per language), `SkyThemeContext` (day/night). All three use `useSyncExternalStore` with a separate server snapshot, so server and client markup agree during hydration and stored values are adopted after mount.

The theme flips by inverting the `slate` scale in CSS variables under `:root[data-sky="day"]`. Tailwind v4 compiles utilities to `var(--color-slate-N)`, so the entire theme changes without touching a component.

## Running it

Node 20+ (developed on 24.21) and npm.

```bash
npm install
cp .env.example .env.local     # Gemini key optional
npm run dev                    # http://localhost:3000
```

The app is fully functional with no key: the AI fit check falls back to the local engine and says so in the UI.

To enable live AI, add the key to `.env.local` and **restart the server** — Next reads env vars only at startup:

```
GEMINI_API_KEY=your_key        # https://aistudio.google.com/apikey
GEMINI_MODEL=                  # optional, defaults to gemini-3.6-flash
```

Build and checks: `npm run build`, `npm run lint`.

## Test scenario

Five minutes, covering what separates this from a plain calculator.

1. **"Find Your Future"** in the header. Grade 11, GPA 3.9, SAT 1500, IELTS 7.5, one Olympiads/Research activity, Computer Science. Build the list.
2. **Diagnostic** — check the index and open "Diagnostic notes". Copy adapts to grade: a 10th grader is pointed at PSAT and GPA trajectory, a 12th grader at essays and aid forms.
3. **The eight-university matrix.** Note that the two percentages differ, most sharply at merit-scholarship schools.
4. **Remove the scores.** "Edit Baseline Profile" → step 2 → "Applying test-optional". Testing readiness goes neutral, not to zero, and the list rebuilds in place.
5. **Check the region contract.** Step 4 → select Asia only. US universities stay in the results, just lower. There is no region filter here.
6. **AI fit check** on any card. The source tag shows whether Gemini answered or the offline engine did.
7. **Roadmap** — priority actions with percentages. Those numbers are measured: each action is replayed through the same matching engine and the delta is recorded.
8. **Export strategy** → "Print / PDF" and the JSON backup. Export and re-import reproduces an identical list.
9. **Switch to RU.** Interface, diagnostics and strategy text all translate.

## Team

> **Fill in before submission.** Format below; the actual roster is not recorded in this file.

| Member | Role | Owned |
|---|---|---|
| — | — | — |

## Data sources

| File | Contents | Origin |
|---|---|---|
| `data/universities.json` | 16 anchor universities, fully described in both languages | Curated. 10 of 16 now carry official admissions figures; 6 are labelled "Estimated" in the UI |
| `data/funded-directory.json` | 74 institutions covering tuition and housing in full, 11 countries | Compiled from [Grantitude](https://www.grantitude.net/); attribution and retrieval date sit at the top of the file |
| Admissions figures | Admit rate, average SAT, cost of attendance | [College Scorecard](https://collegescorecard.ed.gov/), open US Department of Education data |
| `data/qualitativeData.json` | Campus culture for 16 schools: five dimensions, stress index, feeder strength | Hand-authored from public knowledge. Editorial assessment, not a dataset export |

Grantitude advertises 121 entries; their data holds 109, and 74 of those cover tuition **and** room and board. Only those 74 were imported.

Of the 55 universities in the matchable pool, 49 carry official figures and 6 are estimated and labelled.

## AI and APIs

**Google Gemini** — qualitative campus assessment against a specific student profile.

- Endpoint: `https://generativelanguage.googleapis.com/v1/models/{model}:generateContent`
- Default model `gemini-3.6-flash`, overridable via `GEMINI_MODEL`
- Strict JSON via `responseMimeType: "application/json"`, `temperature: 0.4`, 12s timeout
- Server-side only, in `app/api/vibe-check/route.ts`

With no key, no network, a retired model or Google overload, `lib/qualitativeEvaluator.ts` takes over and returns a deterministic result from local data. The API response always carries a `source` field and the UI reports it honestly: "Live AI analysis" or "Offline culture profile".

**College Scorecard API** (`api.data.gov`) was used once during data preparation and is not called at runtime.

## Pre-existing components

Written from scratch during the hackathon. Not ours:

- the `create-next-app` template (base `app/` structure, configs);
- `lucide-react` icons;
- `public/collistlogo.png`, supplied by the project author (the repo also holds a derived `collistlogo-mark.png` with the background removed);
- `public/enhanced_stanf.png`, the campus photograph;
- university logos in `public/logos/`, fetched via Google's favicon service; the marks belong to the institutions;
- the datasets listed under Data sources.

All matching, diagnostic, roadmap logic and the entire interface were written for this project.

## Known limitations

- **26 directory universities do not participate in matching.** No official admissions statistics exist for them — they are non-US, and US federal data does not cover them. They remain browsable with real deadlines and aid links but are not ranked. This is the main limitation today.
- **6 of 55 carry estimated figures**, labelled "Estimated" in the UI.
- **Almost nobody publishes a GPA cut-off.** Where it is absent, that criterion's weight is redistributed to testing and activities rather than scored as zero.
- **Payments are not wired.** The subscription screen is UI with no backend: card fields live in component state only, are never transmitted or stored, and the pay button does nothing.
- **The four Pro features are not built** — they are described on the subscription screen as a plan.
- **Directory programme text is English only.** Machine-translating funding wording is risky; a mistranslated term misleads about money.
- **Roadmap deadlines are generic** (Nov 1 / Jan 1), not per-school. The directory carries specific ones.
- **No automated test suite in the repo.** How it was verified is below.
- **Profiles live in the browser only.** No accounts; device transfer is via JSON export.

## Technical reference

### Libraries and services

| | |
|---|---|
| Framework | Next.js 16.3.5 (App Router, Turbopack) |
| UI | React 19.2.8, TypeScript 5 (strict), Tailwind CSS v4.3.3 |
| Icons | lucide-react |
| Fonts | Poppins (display), Manrope (UI) via `next/font/google`, self-hosted |
| External services | Google Gemini API (runtime), College Scorecard API (data prep) |
| Storage | browser `localStorage`, keys `collist.profile`, `collist.language`, `collist.sky` |

Manrope was chosen over Plus Jakarta Sans deliberately: the latter ships no Cyrillic subset, so the Russian interface would have fallen back to a system font. Poppins has no Cyrillic either, so `--font-display` lists Manrope second to catch Cyrillic glyphs.

### How results were verified

- **Build and types.** `npm run build` and `npm run lint` pass with no errors or warnings. Strict TypeScript; optional fields (`minGpa`, `avgSat`, `coaUsd`) are typed as optional, so the compiler itself finds every place a check was forgotten.
- **Engines tested in isolation.** The pure `lib/` modules were compiled to CommonJS and run in Node, outside React: roughly 200 assertions across diagnostics, matching, roadmap, export and profile migration. Edge cases included GPA 0, the 5.0 scale, `undefined` in place of arrays, a negative SAT, an empty university list and corrupt JSON in storage. Two crashes found this way were fixed (a `.length` read on an undefined array, in two engines).
- **Region-as-weight** was verified separately: with Asia selected, non-Asian universities remain in the results and both probabilities match the no-preference run exactly — only the ordering moves.
- **The API route was exercised with live requests**: with no key, with a deliberately invalid key (a real call to Google, rejected, falling through to the offline engine), across all 74 institutions, and with malformed request bodies (404 / 400 / 400).
- **Bilingual coverage is script-checked**: key-set parity, no empty values, no hardcoded English in components, and every dynamically constructed key resolving in both languages.
- **Profile migration** was tested against the previous schema: the old boolean `isTestOptional` maps to the three-way status, a bare `gpa` is read on the 4.0 scale, and missing arrays become empty.

Those check scripts were written for specific tasks and are not in the repository — a deliberate debt rather than an oversight; within the time available a working product took priority.

### Security measures

- **The Gemini key never leaves the server.** Calls happen only in the route; the browser receives finished JSON. `.env.local` is gitignored and no key appears anywhere in the repository history.
- **Model output is untrusted.** `isValidVibeCheck()` shape-checks the reply before render: anything malformed falls back to the local profile instead of painting `undefined` into a card.
- **Card details go nowhere.** `PricingModal` contains no `fetch`, no `localStorage` and no context writes; every field carries `autoComplete="off"`; values live in component state and die with it.
- **Stored data is validated field by field.** `reconcileProfile()` rejects out-of-range GPAs, unknown grade levels and non-string values, truncates lists to their limits (10 activities, 5 honours, 150-character descriptions) and drops unrecognised keys. The same path guards JSON import, so a hand-edited file cannot inject anything.
- **External links** open with `rel="noopener noreferrer"`.
- **No telemetry.** The profile never leaves the browser unless the user exports it.
