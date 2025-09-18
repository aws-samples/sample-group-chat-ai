# Group Chat AI - שיחות AI שיתופיות

> • 🇺🇸 **This document is also available in:** [English](../README.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./README_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./README_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./README_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./README_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](#)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./README_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./README_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./README_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./README_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./README_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./README_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./README_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./README_zh.md)


**📖 מסמך זה זמין במספר שפות:**
- 🇸🇦 [العربية (Arabic)](docs/README_ar.md)
- 🇩🇪 [Deutsch (German)](docs/README_de.md) 
- 🇪🇸 [Español (Spanish)](docs/README_es.md)
- 🇫🇷 [Français (French)](docs/README_fr.md)
- 🇮🇹 [Italiano (Italian)](docs/README_it.md)
- 🇯🇵 [日本語 (Japanese)](docs/README_ja.md)
- 🇰🇷 [한국어 (Korean)](docs/README_ko.md)
- 🇵🇹 [Português (Portuguese)](docs/README_pt.md)
- 🇷🇺 [Русский (Russian)](docs/README_ru.md)
- 🇸🇪 [Svenska (Swedish)](docs/README_sv.md)
- 🇨🇳 [中文 (Chinese)](docs/README_zh.md)

---

Group Chat AI הוא פלטפורמה שיתופית מתקדמת המאפשרת שיחות קבוצתיות דינמיות עם מספר פרסונות AI. המערכת מקלה על דיונים משמעותיים על פני נקודות מבט מגוונות, ומאפשרת למשתמשים לחקור רעיונות, לקבל משוב ולהשתתף בשיחות רב-משתתפים עם סוכני AI המייצגים תפקידים ונקודות מבט שונות.

## 🏗️ סקירת ארכיטקטורה

```
User Input → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### תכונות מרכזיות

- **שיחות רב-פרסונות**: השתתפות עם מספר פרסונות AI בו-זמנית בדיונים קבוצתיים
- **דפוסי אינטראקציה דינמיים**: זרימת שיחה בזמן אמת עם תורנות טבעית ותגובות
- **נקודות מבט מגוונות**: כל פרסונה מביאה נקודות מבט ייחודיות, מומחיות וסגנונות תקשורת
- **פתרון בעיות שיתופי**: עבודה על נושאים מורכבים עם סוכני AI המציעים גישות שונות
- **התמדה של סשן**: שמירה על הקשר השיחה ועקביות הפרסונה לאורך הסשנים
- **התאמה אישית גמישה של פרסונות**: יצירה ושינוי של פרסונות AI עם תיאורים בשפה טבעית
- **תמיכה במספר LLM**: מינוף מודלי שפה שונים כולל AWS Bedrock, OpenAI, Anthropic ו-Ollama

## 🚀 התחלה מהירה

### דרישות מוקדמות

- Node.js 20+ 
- npm 8+
- Docker (אופציונלי, עבור קונטיינריזציה)
- AWS CLI (עבור פריסה)

### התקנה

1. **שכפול המאגר**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
   ```

2. **התקנת תלויות**
   ```bash
   npm run install:all
   ```

3. **הגדרת משתני סביבה**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # ערוך את backend/.env עם התצורה שלך
   
   # Frontend ישתמש בתצורת proxy של Vite
   ```

4. **בניית חבילה משותפת**
   ```bash
   npm run build:shared
   ```

### פיתוח

1. **הפעלת שרת הbackend**
   ```bash
   npm run dev:backend
   ```
   Backend יהיה זמין בכתובת `http://localhost:3000`

2. **הפעלת שרת הפיתוח של הfrontend**
   ```bash
   npm run dev:frontend
   ```
   Frontend יהיה זמין בכתובת `http://localhost:3001`

3. **בדיקת הAPI**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 מבנה הפרויקט

```
group-chat-ai/
├── shared/                 # סוגי TypeScript משותפים וכלי עזר
│   ├── src/
│   │   ├── types/         # הגדרות סוגים נפוצות
│   │   ├── constants/     # קבועי האפליקציה
│   │   └── utils/         # פונקציות עזר משותפות
├── backend/               # שרת API של Express.js
│   ├── src/
│   │   ├── controllers/   # מטפלי נתיבי API
│   │   ├── services/      # שירותי לוגיקה עסקית
│   │   ├── middleware/    # middleware של Express
│   │   ├── config/        # קבצי תצורה
│   │   └── utils/         # כלי עזר של Backend
├── frontend/              # אפליקציית React
│   ├── src/
│   │   ├── components/    # רכיבי React לשימוש חוזר
│   │   ├── pages/         # רכיבי עמוד
│   │   ├── services/      # שכבת שירות API
│   │   ├── hooks/         # hooks מותאמים של React
│   │   └── utils/         # כלי עזר של Frontend
├── infrastructure/        # קוד תשתית AWS CDK
├── tests/                 # קבצי בדיקה
└── documents/             # תיעוד הפרויקט
```

## 🔧 סקריפטים זמינים

### רמת שורש
- `npm run install:all` - התקנת כל התלויות
- `npm run build` - בניית כל החבילות
- `npm run test` - הרצת כל הבדיקות
- `npm run lint` - בדיקת lint לכל החבילות

### Backend
- `npm run dev:backend` - הפעלת backend במצב פיתוח
- `npm run build:backend` - בניית backend
- `npm run test:backend` - הרצת בדיקות backend

### Frontend
- `npm run dev:frontend` - הפעלת שרת פיתוח frontend
- `npm run build:frontend` - בניית frontend לייצור
- `npm run test:frontend` - הרצת בדיקות frontend

### פרסונות ובינאום
- `npm run personas:generate` - יצירת personas.json באנגלית מהגדרות משותפות
- `npm run docs:translate` - תרגום כל התיעוד לשפות הנתמכות
- `npm run docs:translate:single -- --lang es` - תרגום לשפה ספציפית

## 🌐 נקודות קצה של API

### בדיקת תקינות
- `GET /health` - בדיקת תקינות בסיסית
- `GET /health/detailed` - מידע תקינות מפורט

### פרסונות
- `GET /personas` - קבלת כל הפרסונות הזמינות
- `GET /personas/:personaId` - קבלת פרטי פרסונה ספציפית

### סשנים
- `POST /sessions` - יצירת סשן שיחה חדש
- `POST /sessions/:sessionId/messages` - שליחת הודעה וקבלת תגובות
- `PUT /sessions/:sessionId/personas` - עדכון פרסונות הסשן
- `GET /sessions/:sessionId/summary` - קבלת סיכום הסשן
- `DELETE /sessions/:sessionId` - סיום הסשן
- `GET /sessions/:sessionId` - קבלת פרטי הסשן

## 🤖 אינטגרציית AI

המערכת תומכת במספר ספקי LLM דרך ממשק הניתן להגדרה:

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (מודלים שונים)
- **Ollama** (מודלים מקומיים)

הגדרה באמצעות משתני סביבה:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### מצב פיתוח
במצב פיתוח, המערכת משתמשת בתגובות מדומות כדי לדמות אינטראקציות AI מבלי לדרוש מפתחות API.

## 🎭 פרסונות

המערכת כוללת פרסונות AI מגוונות שניתן להתאים לתרחישי שיחה קבוצתית שונים:

1. **יועץ אסטרטגי** - תכנון ברמה גבוהה, חזון וכיוון אסטרטגי
2. **מומחה טכני** - ידע טכני עמוק, פרטי יישום ופתרונות
3. **אנליסט** - תובנות מונעות נתונים, מחקר ונקודות מבט אנליטיות  
4. **חושב יצירתי** - חדשנות, סיעור מוחות ורעיונות מחוץ לקופסה
5. **מנחה** - ניהול דיונים, בניית קונצנזוס ושיתוף פעולה

### מבנה פרסונה
כל פרסונה מוגדרת על ידי רק 4 שדות פשוטים:
- **שם**: שם תצוגה (למשל, "יועץ אסטרטגי")
- **תפקיד**: מזהה תפקיד קצר (למשל, "אסטרטג")
- **פרטים**: תיאור טקסט חופשי כולל רקע, עדיפויות, דאגות ורמת השפעה
- **בחירת אווטר**: ייצוג חזותי מאפשרויות האווטר הזמינות

### התאמה אישית של פרסונה
- **עריכת פרסונות ברירת מחדל**: שינוי פרטי כל פרסונת ברירת מחדל בשפה טבעית
- **יצירת פרסונות מותאמות**: בניית פרסונות מותאמות לחלוטין עם התיאורים שלך
- **התמדה של סשן**: כל ההתאמות האישיות של הפרסונות נשמרות לאורך סשני הדפדפן
- **ייבוא/ייצוא**: שמירה ושיתוף תצורות פרסונה באמצעות קבצי JSON
- **ממשק מבוסס אריחים**: בחירה חזותית של אריחים עם יכולות עריכה מקיפות

### יישום טכני
כל פרסונה שומרת על:
- הקשר שיחה מבודד לתגובות אותנטיות
- עיבוד שפה טבעית של שדה הפרטים ליצירת prompt של AI
- דפוסי תגובה ספציפיים לתפקיד על בסיס המאפיינים המתוארים
- תורנות חכמה לזרימת שיחה קבוצתית טבעית

## 🌐 בינאום וניהול פרסונות

### זרימת עבודה של הגדרת פרסונה
1. **מקור האמת**: כל הגדרות הפרסונות נשמרות ב-`shared/src/personas/index.ts`
2. **יצירה**: הרץ `npm run personas:generate` ליצירת קובץ תרגום `personas.json` באנגלית
3. **תרגום**: השתמש בסקריפטי תרגום קיימים ליצירת קבצי פרסונה מקומיים

### תהליך תרגום פרסונות
```bash
# 1. עדכן הגדרות פרסונה בחבילה המשותפת
vim shared/src/personas/index.ts

# 2. צור personas.json באנגלית מהגדרות משותפות
npm run personas:generate

# 3. תרגם פרסונות לכל השפות הנתמכות
npm run docs:translate  # מתרגם את כל הקבצים כולל personas.json
# או תרגם לשפה ספציפית
npm run docs:translate:single -- --lang es

# 4. בנה מחדש חבילה משותפת במידת הצורך
npm run build:shared
```

### מבנה קובץ תרגום
- **מקור**: `shared/src/personas/index.ts` (הגדרות TypeScript)
- **נוצר**: `frontend/public/locales/en/personas.json` (i18n באנגלית)
- **מתורגם**: `frontend/public/locales/{lang}/personas.json` (גרסאות מקומיות)

### שפות נתמכות
המערכת תומכת ב-14 שפות עבור פרסונות ותיעוד:
- 🇺🇸 English (en) - שפת מקור
- 🇸🇦 العربية (ar) - ערבית
- 🇩🇪 Deutsch (de) - גרמנית
- 🇪🇸 Español (es) - ספרדית
- 🇫🇷 Français (fr) - צרפתית
- 🇮🇱 עברית (he) - עברית
- 🇮🇹 Italiano (it) - איטלקית
- 🇯🇵 日本語 (ja) - יפנית
- 🇰🇷 한국어 (ko) - קוריאנית
- 🇳🇱 Nederlands (nl) - הולנדית
- 🇵🇹 Português (pt) - פורטוגזית
- 🇷🇺 Русский (ru) - רוסית
- 🇸🇪 Svenska (sv) - שוודית
- 🇨🇳 中文 (zh) - סינית

### הוספת פרסונות חדשות
1. הוסף הגדרת פרסונה ל-`shared/src/personas/index.ts`
2. הרץ `npm run personas:generate` לעדכון תרגומים באנגלית
3. הרץ סקריפטי תרגום ליצירת גרסאות מקומיות
4. הפרסונה החדשה תהיה זמינה בכל השפות הנתמכות

## 🔒 תכונות אבטחה

- **אימות קלט**: כל קלטי המשתמש מאומתים ומנוקים
- **בידוד סשן**: כל סשן שומר על הקשר נפרד
- **טיפול בשגיאות**: טיפול חלק בשגיאות עם הודעות ידידותיות למשתמש
- **הגבלת קצב**: הגנה מובנית נגד שימוש לרעה
- **HTTPS**: כל התקשורת מוצפנת בייצור

## 📊 ניטור ותצפיתיות

- **רישום מובנה**: יומנים בפורמט JSON עם Winston
- **בדיקות תקינות**: ניטור תקינות מקיף
- **מדדים**: מדדי אפליקציה מותאמים
- **מעקב שגיאות**: רישום ומעקב מפורט של שגיאות

## 🚢 פריסה

### Docker
```bash
# בניית תמונת backend
cd backend
npm run docker:build

# הרצת קונטיינר
npm run docker:run
```

### פריסת AWS
```bash
# פריסת תשתית
cd infrastructure
npm run deploy:dev # החלף :dev ב-staging או prod עבור הסביבות האלה
```

## ⚠️ אזהרת אזור פריסה!
כברירת מחדל, מודל הניתוב עבור Bedrock הוא OpenAI gpt-oss:20b (`openai.gpt-oss-20b-1:0`). מודל הפרסונה מנצל Anthropic Claude 4 Sonnet (`anthropic.claude-sonnet-4-20250514-v1:0`). אנא וודא שאתה פורס לאזור התומך בשני המודלים, או הגדר מודלים חלופיים.

## 🧪 בדיקות

### בדיקות יחידה
```bash
npm run test
```

### בדיקות אינטגרציה
```bash
npm run test:integration
```

### בדיקות E2E
```bash
npm run test:e2e
```

## 📈 יעדי ביצועים

- **זמן תגובה**: < 3 שניות לתגובות פרסונה
- **זמינות**: 99.9% זמינות API
- **מקביליות**: תמיכה ב-1000+ משתמשים במקביל
- **שיחות קבוצתיות**: עד 5 פרסונות לכל סשן עם זרימת שיחה טבעית

## 🤝 תרומה

1. עשה fork למאגר
2. צור ענף תכונה
3. בצע את השינויים שלך
4. הוסף בדיקות
5. שלח pull request

## 📄 רישיון

פרויקט זה מורשה תחת רישיון MIT - ראה את קובץ LICENSE לפרטים.