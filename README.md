# Dutch Thrift - Premium Consignment Platform

Een modern platform voor het beheren van consignatie voor kleding en andere items.

## Beschrijving

Dutch Thrift is een consignatie-platform dat winkeliers helpt bij het beheren van hun inventaris en verkoop. De applicatie maakt gebruik van AI om items te analyseren, marktprijzen te schatten en waardevolle inzichten te bieden voor consignatie-beslissingen.

## Functionaliteiten

- **Storefront met uploadfunctie**: Een gebruiksvriendelijke interface waar gebruikers direct items kunnen uploaden.
- **Aanmelden/Registreren**: Volledig inlogsysteem met ondersteuning voor zowel traditionele e-mail/wachtwoord als social login.
- **Consignor Dashboard**: Een dashboard waar consignors hun items en bestellingen kunnen beheren.
- **Admin Dashboard**: Een uitgebreid dashboard voor beheerders om alle consignors, items en bestellingen te overzien.
- **AI Analyse**: Geavanceerde analyse van items met behulp van AI om nauwkeurige waardebepalingen te doen.

## Technologieën

- **Backend**: Node.js met Express
- **Database**: PostgreSQL via Supabase
- **Authenticatie**: Express-session met bcrypt en Supabase Auth
- **Frontend**: EJS templates met moderne CSS
- **AI Integratie**: OpenAI voor beeldanalyse

## Installatie en Gebruik in Replit

1. Fork deze Replit of clone de repository.
2. Zorg ervoor dat je de juiste omgevingsvariabelen hebt ingesteld:
   - `DATABASE_URL`: Verbindingsstring voor je PostgreSQL database
   - `SUPABASE_URL`: URL van je Supabase project
   - `SUPABASE_KEY`: Supabase API sleutel
   - `OPENAI_API_KEY`: OpenAI API sleutel (voor AI analyse)
   - `SESSION_SECRET`: Een willekeurige string voor sessieversleuteling

3. Start de applicatie met:
   ```
   npm run dev
   ```

4. Bezoek de volgende routes om de applicatie te gebruiken:
   - `/` - Storefront hoofdpagina
   - `/login` - Inlogpagina
   - `/login?mode=register` - Registratiepagina
   - `/consignor/dashboard` - Consignor dashboard (na inloggen)
   - `/admin` - Admin dashboard (na inloggen als admin)

## Testaccounts

Voor testdoeleinden zijn de volgende accounts beschikbaar:

- **Admin**: admin@test.com / adminpass123
- **Consignor**: consignor@test.com / consignorpass123

## Projectstructuur

- `server/` - Backend code en routes
  - `views/` - EJS templates
  - `routes/` - Express routes
  - `public/` - Statische bestanden
- `public/` - Publiek toegankelijke bestanden
  - `uploads/` - Geüploade afbeeldingen van items

## Licentie

Bedrijfseigen software - Alle rechten voorbehouden © 2025 Dutch Thrift