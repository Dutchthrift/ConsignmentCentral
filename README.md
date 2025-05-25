# Dutch Thrift - Premium Consignment Platform

Een compacte Node.js Express webapplicatie voor een consignment platform dat het mogelijk maakt om kleding en accessoires aan te melden voor verkoop. De app maakt gebruik van AI (GPT-4 Vision) voor de analyse van geüploade afbeeldingen en biedt een complete flow van aanmelding tot verkoop.

## Functionaliteiten

- **Landing Page**: Gebruikers kunnen items uploaden met titel en afbeelding
- **Item Intake**: Drag-and-drop interface voor het uploaden van afbeeldingen
- **AI Analyse**: GPT-4 Vision analyse van producttype, merk, conditie en accessoires
- **Waardeschatting**: Prijsinschatting op basis van AI-analyse en (mock) eBay data
- **Voorstel Acceptatie**: Gebruikers kunnen het verkoopvoorstel accepteren of weigeren
- **Account Beheer**: Automatische account creatie en order verwerking
- **Dashboard**: Consignors kunnen hun items en verdiensten bijhouden

## Technische Stack

- **Backend**: Node.js, Express
- **Frontend**: EJS templates, Vanilla JavaScript, CSS
- **Database**: PostgreSQL (via Supabase)
- **AI**: OpenAI GPT-4 Vision API
- **Authenticatie**: Supabase Auth
- **Storage**: Lokale opslag voor uploads

## Installatie en Setup

### Vereisten

- Node.js (versie 16 of hoger)
- Een Supabase account en project
- Een OpenAI API sleutel

### Omgevingsvariabelen

Maak een `.env` bestand aan in de hoofdmap van het project met de volgende variabelen:

```
PORT=5000
NODE_ENV=development
SESSION_SECRET=een_willekeurige_geheime_sleutel
SUPABASE_URL=jouw_supabase_project_url
SUPABASE_KEY=jouw_supabase_api_sleutel
OPENAI_API_KEY=jouw_openai_api_sleutel
```

### Installatie

1. Clone de repository
2. Installeer de dependencies:
   ```
   npm install
   ```
3. Start de applicatie:
   ```
   npm start
   ```

## Gebruik in Replit

1. Fork dit project naar je eigen Replit account
2. Voeg de bovengenoemde omgevingsvariabelen toe in het Secrets tabblad van je Replit
3. Klik op de "Run" knop om de applicatie te starten
4. Open de gegenereerde URL om de applicatie te bekijken

## Databasestructuur

De applicatie maakt gebruik van de volgende tabellen in Supabase:

- **users**: Admin gebruikers
- **customers**: Consignor gebruikers
- **items**: Aangemelde items voor verkoop
- **orders**: Orders die items bevatten
- **order_items**: Koppeltabel tussen orders en items
- **pricing**: Prijsinformatie voor items

## API Endpoints

- `GET /`: Landing page
- `GET /login`: Login pagina
- `POST /login`: Authenticatie
- `GET /logout`: Uitloggen
- `GET /storefront/submit-item`: Item aanmelden
- `POST /storefront/submit-item`: Item verwerken en analyseren
- `GET /storefront/proposal`: Prijsvoorstel bekijken
- `POST /storefront/proposal`: Voorstel accepteren of weigeren
- `GET /consignor/dashboard`: Consignor dashboard

## Ontwikkelaars

Dit project is ontwikkeld als een compacte showcase van een consignment platform. De code is gestructureerd om eenvoudig uit te breiden met extra functionaliteiten zoals verzendlabel generatie via SendCloud en betalingsverwerking.