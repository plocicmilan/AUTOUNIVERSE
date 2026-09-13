// AutoUniverse Autodelovi — shared enums (server + client validation)
const CATEGORIES = [
  'motor', 'menjac', 'kocnice', 'trap', 'karoserija',
  'elektrika', 'klima', 'filteri', 'gume', 'stakla', 'enterijer',
  'airbag', 'audio', 'branik', 'felne', 'auspuh',
  'kljucevi', 'ceo_auto', 'zaptivaci', 'alati', 'servisni',
  'usluge', 'svetla', 'ostalo',
];

const CONDITIONS = ['nov', 'polovan', 'renoviran', 'neispravan'];

const CURRENCIES = ['RSD', 'EUR'];

const CONTACT_METHODS = ['phone_call', 'whatsapp', 'viber', 'email'];

module.exports = { CATEGORIES, CONDITIONS, CURRENCIES, CONTACT_METHODS };
