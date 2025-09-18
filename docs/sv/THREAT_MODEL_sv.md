
> • 🇺🇸 **This document is also available in:** [English](../THREAT_MODEL.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./THREAT_MODEL_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./THREAT_MODEL_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./THREAT_MODEL_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./THREAT_MODEL_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./THREAT_MODEL_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./THREAT_MODEL_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./THREAT_MODEL_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./THREAT_MODEL_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./THREAT_MODEL_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./THREAT_MODEL_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./THREAT_MODEL_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](#)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./THREAT_MODEL_zh.md)

<!--
 Copyright 2025 Amazon.com, Inc. or its affiliates.
 SPDX-License-Identifier: MIT-0
-->

# Group Chat AI
## Applikationsinformation
Detta är en realtids-AI-plattform för konversation som gör det möjligt för användare att öva presentationer med flera AI-personas. Funktionerna inkluderar WebSocket-kommunikation, röstsyntes, bilduppladdningar, skapande av anpassade personas och AWS Bedrock-integration för LLM-bearbetning.

## Arkitektur
### Introduktion
**Översikt över Group Chat-arkitekturen:**

1. **Frontend-lager**: React-applikation som serveras via Amazon CloudFront med S3 statisk hosting, stöder realtids WebSocket-anslutningar och bilduppladdningar
2. **Autentisering**: Amazon Cognito User Pool med OAuth 2.0/OIDC för säker användarhantering
3. **Nätverkssäkerhet**: VPC-arkitektur med ALB begränsad till CloudFront IP-intervall, privata subnät för backend-tjänster
4. **Backend-tjänster**: ECS Fargate som hostar Express.js-server med WebSocket-stöd, ConversationOrchestrator, PersonaManager och SessionService
5. **AI-integration**: Amazon Bedrock för LLM-bearbetning (Claude-modeller), AWS Polly för röstsyntes med persona-specifika röster
6. **Konfiguration**: Parameter Store för centraliserad konfiguration, CloudWatch för omfattande övervakning och loggning

## Dataflöde
### Introduktion
#### Entiteter:

| Entitet | Beskrivning |
|-|-|
| User | Individ som övar presentationer med AI-personas |
| React Frontend | Webbapplikation med realtidschatt och röstfunktioner |
| CloudFront | CDN som serverar frontend och proxar API/WebSocket-förfrågningar |
| Amazon Cognito | Användarautentisering och sessionshantering |
| ALB | Application Load Balancer med CloudFront IP-begränsningar |
| ECS Backend | Express.js-server med WebSocket och AI-orkestrering |
| Amazon Bedrock | LLM-tjänst för AI-persona-svar |
| Amazon Polly | Text-till-tal-tjänst för röstsyntes |
| Parameter Store | Konfigurationshanteringstjänst |

#### Dataflöden:

| Flödes-ID | Beskrivning | Källa | Mål | Tillgångar |
|-|-|-|-|-|
| DF1 | Användarautentiseringsflöde | User | Amazon Cognito | Användaruppgifter, JWT-tokens |
| DF2 | Frontend-applikationsåtkomst | User | CloudFront | HTTP-förfrågningar, statiska tillgångar |
| DF3 | Realtidskommunikation | User | ECS Backend | WebSocket-anslutningar, chattmeddelanden |
| DF4 | API-förfrågningsroutning | CloudFront | ALB | Autentiserade API-förfrågningar |
| DF5 | AI-konversationsbearbetning | ECS Backend | Amazon Bedrock | Användarprompter, persona-svar |
| DF6 | Röstsyntesförfrågningar | ECS Backend | Amazon Polly | Textinnehåll, ljudströmmar |
| DF7 | Bilduppladdning och analys | User | ECS Backend | Bildfiler, analysresultat |
| DF8 | Konfigurationshämtning | ECS Backend | Parameter Store | Applikationskonfiguration |
| DF9 | Sessionstillståndshantering | ECS Backend | In-Memory Store | Användarsessioner, konversationshistorik |

#### Förtroendegränser:

| Gräns-ID | Syfte | Källa | Mål |
|-|-|-|-|
| TB1 | Internet/CDN-gräns | User | CloudFront |
| TB2 | CDN/Load Balancer-gräns | CloudFront | ALB |
| TB3 | Load Balancer/Applikationsgräns | ALB | ECS Backend |
| TB4 | Applikation/AI-tjänstgräns | ECS Backend | Amazon Bedrock |
| TB5 | Applikation/Rösttjänstgräns | ECS Backend | Amazon Polly |
| TB6 | Applikation/Konfigurationsgräns | ECS Backend | Parameter Store |
| TB7 | Användarsessionsisolationsgräns | User Session A | User Session B |

#### Hotkällor:

| Kategori | Beskrivning | Exempel |
|-|-|-|
| Externa angripare | Obehöriga användare som försöker få systemåtkomst | Webbangripare, API-missbrukare |
| Skadliga användare | Autentiserade användare med skadliga avsikter | Prompt injection-angripare, dataexfiltreringsförsök |
| Komprometterade konton | Legitima konton under angripares kontroll | Sessionskapare, credential stuffers |
| AI-modellhot | Hot riktade mot AI/LLM-komponenter | Modellmanipulation, prompt injection |
| Infrastrukturhot | Hot mot underliggande AWS-tjänster | Tjänststörningar, konfigurationstampering |

## Antaganden

| Antagandenummer | Antagande | Länkade hot | Länkade motåtgärder | Kommentarer |
| --- | --- | --- | --- | --- |
| <a name="A-0005"></a>A-0005 | Känslig konfigurationsdata innehåller inte hårdkodade hemligheter eller uppgifter | [**T-0008**](#T-0008): En intern aktör kan förneka att ha gjort olämpliga förfrågningar till AI-persona, vilket leder till bristande ansvarsskyldighet för systemmissbruk, vilket resulterar i minskad ansvarsskyldighet för revisionsloggar och efterlevnadsregister<br/>[**T-0009**](#T-0009): En skadlig användare med systemåtkomst kan manipulera konversationshistorik eller persona-svar, vilket leder till datatampering och förlust av konversationsintegritet, vilket resulterar i minskad integritet för konversationshistorik och persona-svar |  |  |
| <a name="A-0004"></a>A-0004 | Applikationen genomgår regelbunden säkerhetstestning och sårbarhetsanalyser | [**T-0003**](#T-0003): En skadlig användare med giltiga sessionsuppgifter kan komma åt andra användares konversationssessioner, vilket leder till obehörig datadivulgering och integritetskränkning, vilket resulterar i minskad konfidentialitet för användarkonversationer och sessionsdata<br/>[**T-0006**](#T-0006): En extern hotaktör med stulna eller komprometterade JWT-tokens kan utge sig för att vara legitima användare, vilket leder till obehörig åtkomst till användarkonton och data, vilket resulterar i minskad konfidentialitet och/eller integritet för användarkonton och konversationsdata<br/>[**T-0007**](#T-0007): En skadlig användare kan missbruka röstsyntestjänsten med överdrivna förfrågningar, vilket leder till resursutmattning och ökade kostnader, vilket resulterar i minskad tillgänglighet för rösttjänsten<br/>[**T-0008**](#T-0008): En intern aktör kan förneka att ha gjort olämpliga förfrågningar till AI-persona, vilket leder till bristande ansvarsskyldighet för systemmissbruk, vilket resulterar i minskad ansvarsskyldighet för revisionsloggar och efterlevnadsregister<br/>[**T-0009**](#T-0009): En skadlig användare med systemåtkomst kan manipulera konversationshistorik eller persona-svar, vilket leder till datatampering och förlust av konversationsintegritet, vilket resulterar i minskad integritet för konversationshistorik och persona-svar |  |  |
| <a name="A-0003"></a>A-0003 | Amazon Bedrock och Polly-tjänster har inbyggda säkerhetskontroller mot missbruk |  |  |  |
| <a name="A-0002"></a>A-0002 | CloudFront IP-begränsningar är korrekt konfigurerade för att förhindra ALB-förbikoppling |  |  |  |
| <a name="A-0001"></a>A-0001 | AWS infrastruktursäkerhetskontroller är korrekt konfigurerade och underhållna | [**T-0001**](#T-0001): En skadlig användare med autentiserad åtkomst till systemet kan injicera skadliga prompter i AI-persona-konversationer, vilket leder till manipulation av AI-svar och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet och/eller integritet för AI-persona-svar och konversationsdata<br/>[**T-0002**](#T-0002): En extern angripare kan förbigå CloudFront och direkt komma åt ALB, vilket leder till obehörig API-åtkomst och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet, integritet och/eller tillgänglighet för backend-tjänster och användardata<br/>[**T-0004**](#T-0004): En extern hotaktör kan översvämma systemet med WebSocket-anslutningsförfrågningar, vilket leder till tjänsteförsämring och denial of service, vilket resulterar i minskad tillgänglighet för WebSocket-tjänsten och backend API-tjänsten<br/>[**T-0005**](#T-0005): En skadlig användare kan ladda upp skadliga bilder som innehåller körbar kod eller skadlig programvara, vilket leder till potentiell kodexekvering eller systemkompromiss, vilket resulterar i minskad integritet och/eller tillgänglighet för bildbehandlingstjänsten och backend-infrastrukturen<br/>[**T-0006**](#T-0006): En extern hotaktör med stulna eller komprometterade JWT-tokens kan utge sig för att vara legitima användare, vilket leder till obehörig åtkomst till användarkonton och data, vilket resulterar i minskad konfidentialitet och/eller integritet för användarkonton och konversationsdata |  |  |

## Hot

| Hotnummer | Hot | Motåtgärder | Antaganden | Status | Prioritet | STRIDE | Kommentarer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a name="T-0009"></a>T-0009 | En skadlig användare med systemåtkomst kan manipulera konversationshistorik eller persona-svar, vilket leder till datatampering och förlust av konversationsintegritet, vilket resulterar i minskad integritet för konversationshistorik och persona-svar | [**M-0008**](#M-0008): Använd JWT-tokens med lämplig utgång och validering<br/>[**M-0010**](#M-0010): Implementera korrekt felhantering för att förhindra informationsdivulgering<br/>[**M-0007**](#M-0007): Implementera omfattande loggning och övervakning för säkerhetshändelser<br/>[**M-0003**](#M-0003): Upprätthåll strikt sessionsisolation och implementera korrekta auktoriseringskontroller | [**A-0005**](#A-0005): Känslig konfigurationsdata innehåller inte hårdkodade hemligheter eller uppgifter<br/>[**A-0004**](#A-0004): Applikationen genomgår regelbunden säkerhetstestning och sårbarhetsanalyser |  Löst | Medium |  |  |
| <a name="T-0008"></a>T-0008 | En intern aktör kan förneka att ha gjort olämpliga förfrågningar till AI-persona, vilket leder till bristande ansvarsskyldighet för systemmissbruk, vilket resulterar i minskad ansvarsskyldighet för revisionsloggar och efterlevnadsregister | [**M-0008**](#M-0008): Använd JWT-tokens med lämplig utgång och validering<br/>[**M-0010**](#M-0010): Implementera korrekt felhantering för att förhindra informationsdivulgering<br/>[**M-0003**](#M-0003): Upprätthåll strikt sessionsisolation och implementera korrekta auktoriseringskontroller | [**A-0005**](#A-0005): Känslig konfigurationsdata innehåller inte hårdkodade hemligheter eller uppgifter<br/>[**A-0004**](#A-0004): Applikationen genomgår regelbunden säkerhetstestning och sårbarhetsanalyser |  Löst | Låg |  |  |
| <a name="T-0007"></a>T-0007 | En skadlig användare kan missbruka röstsyntestjänsten med överdrivna förfrågningar, vilket leder till resursutmattning och ökade kostnader, vilket resulterar i minskad tillgänglighet för rösttjänsten | [**M-0004**](#M-0004): Implementera hastighetsbegränsning på API-endpoints och WebSocket-anslutningar | [**A-0004**](#A-0004): Applikationen genomgår regelbunden säkerhetstestning och sårbarhetsanalyser |  Löst | Medium |  |  |
| <a name="T-0006"></a>T-0006 | En extern hotaktör med stulna eller komprometterade JWT-tokens kan utge sig för att vara legitima användare, vilket leder till obehörig åtkomst till användarkonton och data, vilket resulterar i minskad konfidentialitet och/eller integritet för användarkonton och konversationsdata | [**M-0008**](#M-0008): Använd JWT-tokens med lämplig utgång och validering<br/>[**M-0006**](#M-0006): Använd AWS WAF med CloudFront för att skydda mot vanliga webbattacker<br/>[**M-0003**](#M-0003): Upprätthåll strikt sessionsisolation och implementera korrekta auktoriseringskontroller<br/>[**M-0010**](#M-0010): Implementera korrekt felhantering för att förhindra informationsdivulgering | [**A-0004**](#A-0004): Applikationen genomgår regelbunden säkerhetstestning och sårbarhetsanalyser<br/>[**A-0001**](#A-0001): AWS infrastruktursäkerhetskontroller är korrekt konfigurerade och underhållna |  Löst | Medium |  |  |
| <a name="T-0005"></a>T-0005 | En skadlig användare kan ladda upp skadliga bilder som innehåller körbar kod eller skadlig programvara, vilket leder till potentiell kodexekvering eller systemkompromiss, vilket resulterar i minskad integritet och/eller tillgänglighet för bildbehandlingstjänsten och backend-infrastrukturen | [**M-0005**](#M-0005): Validera och sanera bilduppladdningar med filtyp- och storleksbegränsningar | [**A-0001**](#A-0001): AWS infrastruktursäkerhetskontroller är korrekt konfigurerade och underhållna |  Löst | Medium |  |  |
| <a name="T-0004"></a>T-0004 | En extern hotaktör kan översvämma systemet med WebSocket-anslutningsförfrågningar, vilket leder till tjänsteförsämring och denial of service, vilket resulterar i minskad tillgänglighet för WebSocket-tjänsten och backend API-tjänsten | [**M-0004**](#M-0004): Implementera hastighetsbegränsning på API-endpoints och WebSocket-anslutningar | [**A-0001**](#A-0001): AWS infrastruktursäkerhetskontroller är korrekt konfigurerade och underhållna |  Löst | Medium |  |  |
| <a name="T-0003"></a>T-0003 | En skadlig användare med giltiga sessionsuppgifter kan komma åt andra användares konversationssessioner, vilket leder till obehörig datadivulgering och integritetskränkning, vilket resulterar i minskad konfidentialitet för användarkonversationer och sessionsdata | [**M-0008**](#M-0008): Använd JWT-tokens med lämplig utgång och validering<br/>[**M-0006**](#M-0006): Använd AWS WAF med CloudFront för att skydda mot vanliga webbattacker | [**A-0004**](#A-0004): Applikationen genomgår regelbunden säkerhetstestning och sårbarhetsanalyser |  Löst | Medium |  |  |
| <a name="T-0002"></a>T-0002 | En extern angripare kan förbigå CloudFront och direkt komma åt ALB, vilket leder till obehörig API-åtkomst och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet, integritet och/eller tillgänglighet för backend-tjänster och användardata | [**M-0009**](#M-0009): Begränsa ALB-åtkomst till endast CloudFront IP-intervall | [**A-0001**](#A-0001): AWS infrastruktursäkerhetskontroller är korrekt konfigurerade och underhållna |  Löst | Medium |  |  |
| <a name="T-0001"></a>T-0001 | En skadlig användare med autentiserad åtkomst till systemet kan injicera skadliga prompter i AI-persona-konversationer, vilket leder till manipulation av AI-svar och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet och/eller integritet för AI-persona-svar och konversationsdata | [**M-0002**](#M-0002): Använd parametriserade prompter och prompt-isolering för att förhindra AI prompt injection<br/>[**M-0001**](#M-0001): Implementera omfattande inputvalidering och sanering för alla användarinmatningar<br/>[**M-0008**](#M-0008): Använd JWT-tokens med lämplig utgång och validering | [**A-0001**](#A-0001): AWS infrastruktursäkerhetskontroller är korrekt konfigurerade och underhållna |  Löst | Hög |  |  |

## Motåtgärder

| Motåtgärdsnummer | Motåtgärd | Hot som motverkas | Antaganden | Status | Kommentarer |
| --- | --- | --- | --- | --- | --- |
| <a name="M-0010"></a>M-0010 | Implementera korrekt felhantering för att förhindra informationsdivulgering | [**T-0006**](#T-0006): En extern hotaktör med stulna eller komprometterade JWT-tokens kan utge sig för att vara legitima användare, vilket leder till obehörig åtkomst till användarkonton och data, vilket resulterar i minskad konfidentialitet och/eller integritet för användarkonton och konversationsdata<br/>[**T-0008**](#T-0008): En intern aktör kan förneka att ha gjort olämpliga förfrågningar till AI-persona, vilket leder till bristande ansvarsskyldighet för systemmissbruk, vilket resulterar i minskad ansvarsskyldighet för revisionsloggar och efterlevnadsregister<br/>[**T-0009**](#T-0009): En skadlig användare med systemåtkomst kan manipulera konversationshistorik eller persona-svar, vilket leder till datatampering och förlust av konversationsintegritet, vilket resulterar i minskad integritet för konversationshistorik och persona-svar |  | Löst |  |
| <a name="M-0009"></a>M-0009 | Begränsa ALB-åtkomst till endast CloudFront IP-intervall | [**T-0002**](#T-0002): En extern angripare kan förbigå CloudFront och direkt komma åt ALB, vilket leder till obehörig API-åtkomst och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet, integritet och/eller tillgänglighet för backend-tjänster och användardata |  | Löst |  |
| <a name="M-0008"></a>M-0008 | Använd JWT-tokens med lämplig utgång och validering | [**T-0001**](#T-0001): En skadlig användare med autentiserad åtkomst till systemet kan injicera skadliga prompter i AI-persona-konversationer, vilket leder till manipulation av AI-svar och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet och/eller integritet för AI-persona-svar och konversationsdata<br/>[**T-0003**](#T-0003): En skadlig användare med giltiga sessionsuppgifter kan komma åt andra användares konversationssessioner, vilket leder till obehörig datadivulgering och integritetskränkning, vilket resulterar i minskad konfidentialitet för användarkonversationer och sessionsdata<br/>[**T-0006**](#T-0006): En extern hotaktör med stulna eller komprometterade JWT-tokens kan utge sig för att vara legitima användare, vilket leder till obehörig åtkomst till användarkonton och data, vilket resulterar i minskad konfidentialitet och/eller integritet för användarkonton och konversationsdata<br/>[**T-0008**](#T-0008): En intern aktör kan förneka att ha gjort olämpliga förfrågningar till AI-persona, vilket leder till bristande ansvarsskyldighet för systemmissbruk, vilket resulterar i minskad ansvarsskyldighet för revisionsloggar och efterlevnadsregister<br/>[**T-0009**](#T-0009): En skadlig användare med systemåtkomst kan manipulera konversationshistorik eller persona-svar, vilket leder till datatampering och förlust av konversationsintegritet, vilket resulterar i minskad integritet för konversationshistorik och persona-svar |  | Löst |  |
| <a name="M-0007"></a>M-0007 | Implementera omfattande loggning och övervakning för säkerhetshändelser | [**T-0009**](#T-0009): En skadlig användare med systemåtkomst kan manipulera konversationshistorik eller persona-svar, vilket leder till datatampering och förlust av konversationsintegritet, vilket resulterar i minskad integritet för konversationshistorik och persona-svar |  | Löst |  |
| <a name="M-0006"></a>M-0006 | Använd AWS WAF med CloudFront för att skydda mot vanliga webbattacker | [**T-0003**](#T-0003): En skadlig användare med giltiga sessionsuppgifter kan komma åt andra användares konversationssessioner, vilket leder till obehörig datadivulgering och integritetskränkning, vilket resulterar i minskad konfidentialitet för användarkonversationer och sessionsdata<br/>[**T-0006**](#T-0006): En extern hotaktör med stulna eller komprometterade JWT-tokens kan utge sig för att vara legitima användare, vilket leder till obehörig åtkomst till användarkonton och data, vilket resulterar i minskad konfidentialitet och/eller integritet för användarkonton och konversationsdata |  | Löst |  |
| <a name="M-0005"></a>M-0005 | Validera och sanera bilduppladdningar med filtyp- och storleksbegränsningar | [**T-0005**](#T-0005): En skadlig användare kan ladda upp skadliga bilder som innehåller körbar kod eller skadlig programvara, vilket leder till potentiell kodexekvering eller systemkompromiss, vilket resulterar i minskad integritet och/eller tillgänglighet för bildbehandlingstjänsten och backend-infrastrukturen |  | Löst |  |
| <a name="M-0004"></a>M-0004 | Implementera hastighetsbegränsning på API-endpoints och WebSocket-anslutningar | [**T-0004**](#T-0004): En extern hotaktör kan översvämma systemet med WebSocket-anslutningsförfrågningar, vilket leder till tjänsteförsämring och denial of service, vilket resulterar i minskad tillgänglighet för WebSocket-tjänsten och backend API-tjänsten<br/>[**T-0007**](#T-0007): En skadlig användare kan missbruka röstsyntestjänsten med överdrivna förfrågningar, vilket leder till resursutmattning och ökade kostnader, vilket resulterar i minskad tillgänglighet för rösttjänsten |  | Löst |  |
| <a name="M-0003"></a>M-0003 | Upprätthåll strikt sessionsisolation och implementera korrekta auktoriseringskontroller | [**T-0006**](#T-0006): En extern hotaktör med stulna eller komprometterade JWT-tokens kan utge sig för att vara legitima användare, vilket leder till obehörig åtkomst till användarkonton och data, vilket resulterar i minskad konfidentialitet och/eller integritet för användarkonton och konversationsdata<br/>[**T-0008**](#T-0008): En intern aktör kan förneka att ha gjort olämpliga förfrågningar till AI-persona, vilket leder till bristande ansvarsskyldighet för systemmissbruk, vilket resulterar i minskad ansvarsskyldighet för revisionsloggar och efterlevnadsregister<br/>[**T-0009**](#T-0009): En skadlig användare med systemåtkomst kan manipulera konversationshistorik eller persona-svar, vilket leder till datatampering och förlust av konversationsintegritet, vilket resulterar i minskad integritet för konversationshistorik och persona-svar |  | Löst |  |
| <a name="M-0002"></a>M-0002 | Använd parametriserade prompter och prompt-isolering för att förhindra AI prompt injection | [**T-0001**](#T-0001): En skadlig användare med autentiserad åtkomst till systemet kan injicera skadliga prompter i AI-persona-konversationer, vilket leder till manipulation av AI-svar och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet och/eller integritet för AI-persona-svar och konversationsdata |  | Löst |  |
| <a name="M-0001"></a>M-0001 | Implementera omfattande inputvalidering och sanering för alla användarinmatningar | [**T-0001**](#T-0001): En skadlig användare med autentiserad åtkomst till systemet kan injicera skadliga prompter i AI-persona-konversationer, vilket leder till manipulation av AI-svar och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet och/eller integritet för AI-persona-svar och konversationsdata |  | Löst |  |

## Påverkade tillgångar

| Tillgångsnummer | Tillgång | Relaterade hot |
| --- | --- | --- |
| AS-0001 | konversationshistorik | [**T-0009**](#T-0009): En skadlig användare med systemåtkomst kan manipulera konversationshistorik eller persona-svar, vilket leder till datatampering och förlust av konversationsintegritet, vilket resulterar i minskad integritet för konversationshistorik och persona-svar |
| AS-0002 | persona-svar | [**T-0009**](#T-0009): En skadlig användare med systemåtkomst kan manipulera konversationshistorik eller persona-svar, vilket leder till datatampering och förlust av konversationsintegritet, vilket resulterar i minskad integritet för konversationshistorik och persona-svar |
| AS-0003 | revisionsloggar | [**T-0008**](#T-0008): En intern aktör kan förneka att ha gjort olämpliga förfrågningar till AI-persona, vilket leder till bristande ansvarsskyldighet för systemmissbruk, vilket resulterar i minskad ansvarsskyldighet för revisionsloggar och efterlevnadsregister |
| AS-0004 | efterlevnadsregister | [**T-0008**](#T-0008): En intern aktör kan förneka att ha gjort olämpliga förfrågningar till AI-persona, vilket leder till bristande ansvarsskyldighet för systemmissbruk, vilket resulterar i minskad ansvarsskyldighet för revisionsloggar och efterlevnadsregister |
| AS-0005 | rösttjänst | [**T-0007**](#T-0007): En skadlig användare kan missbruka röstsyntestjänsten med överdrivna förfrågningar, vilket leder till resursutmattning och ökade kostnader, vilket resulterar i minskad tillgänglighet för rösttjänsten |
| AS-0006 | användarkonton | [**T-0006**](#T-0006): En extern hotaktör med stulna eller komprometterade JWT-tokens kan utge sig för att vara legitima användare, vilket leder till obehörig åtkomst till användarkonton och data, vilket resulterar i minskad konfidentialitet och/eller integritet för användarkonton och konversationsdata |
| AS-0007 | konversationsdata | [**T-0006**](#T-0006): En extern hotaktör med stulna eller komprometterade JWT-tokens kan utge sig för att vara legitima användare, vilket leder till obehörig åtkomst till användarkonton och data, vilket resulterar i minskad konfidentialitet och/eller integritet för användarkonton och konversationsdata<br/>[**T-0001**](#T-0001): En skadlig användare med autentiserad åtkomst till systemet kan injicera skadliga prompter i AI-persona-konversationer, vilket leder till manipulation av AI-svar och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet och/eller integritet för AI-persona-svar och konversationsdata |
| AS-0008 | bildbehandlingstjänst | [**T-0005**](#T-0005): En skadlig användare kan ladda upp skadliga bilder som innehåller körbar kod eller skadlig programvara, vilket leder till potentiell kodexekvering eller systemkompromiss, vilket resulterar i minskad integritet och/eller tillgänglighet för bildbehandlingstjänsten och backend-infrastrukturen |
| AS-0009 | backend-infrastruktur | [**T-0005**](#T-0005): En skadlig användare kan ladda upp skadliga bilder som innehåller körbar kod eller skadlig programvara, vilket leder till potentiell kodexekvering eller systemkompromiss, vilket resulterar i minskad integritet och/eller tillgänglighet för bildbehandlingstjänsten och backend-infrastrukturen |
| AS-0010 | WebSocket-tjänst | [**T-0004**](#T-0004): En extern hotaktör kan översvämma systemet med WebSocket-anslutningsförfrågningar, vilket leder till tjänsteförsämring och denial of service, vilket resulterar i minskad tillgänglighet för WebSocket-tjänsten och backend API-tjänsten |
| AS-0011 | backend API-tjänst | [**T-0004**](#T-0004): En extern hotaktör kan översvämma systemet med WebSocket-anslutningsförfrågningar, vilket leder till tjänsteförsämring och denial of service, vilket resulterar i minskad tillgänglighet för WebSocket-tjänsten och backend API-tjänsten |
| AS-0012 | användarkonversationer | [**T-0003**](#T-0003): En skadlig användare med giltiga sessionsuppgifter kan komma åt andra användares konversationssessioner, vilket leder till obehörig datadivulgering och integritetskränkning, vilket resulterar i minskad konfidentialitet för användarkonversationer och sessionsdata |
| AS-0013 | sessionsdata | [**T-0003**](#T-0003): En skadlig användare med giltiga sessionsuppgifter kan komma åt andra användares konversationssessioner, vilket leder till obehörig datadivulgering och integritetskränkning, vilket resulterar i minskad konfidentialitet för användarkonversationer och sessionsdata |
| AS-0014 | backend-tjänster | [**T-0002**](#T-0002): En extern angripare kan förbigå CloudFront och direkt komma åt ALB, vilket leder till obehörig API-åtkomst och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet, integritet och/eller tillgänglighet för backend-tjänster och användardata |
| AS-0015 | användardata | [**T-0002**](#T-0002): En extern angripare kan förbigå CloudFront och direkt komma åt ALB, vilket leder till obehörig API-åtkomst och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet, integritet och/eller tillgänglighet för backend-tjänster och användardata |
| AS-0016 | AI-persona-svar | [**T-0001**](#T-0001): En skadlig användare med autentiserad åtkomst till systemet kan injicera skadliga prompter i AI-persona-konversationer, vilket leder till manipulation av AI-svar och potentiell systemkompromiss, vilket resulterar i minskad konfidentialitet och/eller integritet för AI-persona-svar och konversationsdata |