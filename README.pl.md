<div align="center">

[![English](https://img.shields.io/badge/lang-English-lightgrey.svg)](README.md)
[![Polski](https://img.shields.io/badge/lang-Polski-red.svg)](README.pl.md)

</div>

<p align="center"><img src="assets/icon.png" width="96" alt="OpenLibrus"></p>

# OpenLibrus

Aplikacja na Androida do Librusa Synergii, która trzyma kopię danych szkolnych
w telefonie. Logujesz się raz, pobierasz wszystko za jednym razem i korzystasz,
kiedy chcesz, bez internetu. Otwarte oprogramowanie: darmowe, bez reklam, bez
śledzenia, bez zakładania konta poza tym szkolnym.

<p align="center">
  <a href="https://github.com/Kumala3/OpenLibrusPL/releases/latest/download/OpenLibrus.apk"><img src="https://img.shields.io/badge/Pobierz-OpenLibrus.apk-2447c4?style=for-the-badge&logo=android&logoColor=white" alt="Pobierz OpenLibrus.apk"></a>
</p>
<p align="center">
  <a href="https://github.com/Kumala3/OpenLibrusPL/releases/latest/download/OpenLibrus.apk"><img src="docs/download-qr.png" width="160" alt="Kod QR: pobierz OpenLibrus.apk"></a><br>
  <sub>Jesteś przy komputerze? Zeskanuj aparatem w telefonie.</sub>
</p>

**Nieoficjalna.** Nie jest tworzona, wspierana ani zatwierdzana przez Librus
Sp. z o.o. „Librus” i „Librus Synergia” to jej znaki towarowe. Aplikacja
odczytuje to samo API co oficjalna aplikacja, z Twoim własnym loginem, i nigdy
niczego w nim nie zmienia.

## Funkcje

Pięć zakładek:

| Zakładka | Co w niej jest |
|---|---|
| Kalendarz | Pasek tygodnia, który rozwija się w cały miesiąc; przesunięcie w bok zmienia tydzień. Pomarańczowa kropka oznacza dzień ze sprawdzianem lub kartkówką, szara dzień z innymi wpisami, zielone kółko dzień wolny. Wybrany dzień pokazuje lekcje z salą i nauczycielem, odwołaniami i zastępstwami, trwającą lekcję i czas do następnej, nieobecnych nauczycieli oraz to, co jest zadane na ten dzień. Widok Tydzień pokazuje cały tydzień w siatce. |
| Terminarz | Sprawdziany, kartkówki i zadania domowe według dat, z filtrami i minionymi wpisami. |
| Oceny | Wszystkie Twoje przedmioty z ocenami i średnią oraz ocena z zachowania i uwagi. Widok Okresowe pokazuje proponowane i wystawione oceny śródroczne i roczne. Po dotknięciu przedmiotu: kategoria, komentarz i nauczyciel każdej oceny, frekwencja z przedmiotu, to, co nadchodzi, i Mój cel, czyli docelowa średnia z oceną potrzebną, by ją osiągnąć. |
| Frekwencja | Frekwencja ogólna, frekwencja z każdego przedmiotu (od najniższej, na czerwono poniżej 50%, czyli progu nieklasyfikowania) i nieobecności pogrupowane według dni. |
| Ogłoszenia | Ogłoszenia szkoły z klikalnymi linkami i nadchodzące dni wolne. |

Dzwonek w nagłówku otwiera Co nowego: oceny, wpisy, ogłoszenia, uwagi i
nieobecności nauczycieli, które pojawiły się od poprzedniego pobrania, z
ostatnich 30 dni. Szczęśliwy numerek pojawia się w kalendarzu w dni, w które
szkoła go podaje.

Strona „Konto” pokazuje klasę, wychowawcę, szkołę i daty końca semestru i
roku. Jest tam też motyw (jasny i ciemny dopasowują się do telefonu albo można
je ustawić na stałe) i opcjonalne przypomnienie o 18:00 dzień przed sprawdzianem lub
kartkówką. Telefon planuje je sam z pobranych danych, bez łączenia się z
Librusem.

Czego nie ma: wiadomości, bo skrzynka wymaga osobnego logowania kontem
„Konto LIBRUS” (e-mailem), którego login do Synergii nie otwiera; i wersji na
iOS. Aplikacja była testowana na koncie ucznia; konto rodzica może działać,
ale nie było sprawdzane.

## Instalacja

1. W telefonie dotknij **Pobierz** powyżej albo zeskanuj kod QR. Pobierze się
   `OpenLibrus.apk` (zawsze najnowsza wersja).
2. Otwórz plik. Za pierwszym razem Android poprosi o zgodę na instalowanie
   aplikacji z przeglądarki: włącz ją i wróć. Play Protect może nazwać
   aplikację nieznaną, tak jak każdą spoza Sklepu Play (spokojnie, po prostu
   dotknij „Zainstaluj mimo to”). Każde wydanie jest podpisane tym samym
   kluczem, więc Android przyjmie aktualizacje tylko z tej strony.
3. Zaloguj się loginem i hasłem, których używasz na synergia.librus.pl.

Aktualizacje: gdy wyjdzie nowa wersja, na stronie kalendarza pojawi się **Nowa
wersja** z przyciskiem Pobierz. Zainstaluj ją na starą; logowanie i dane
zostaną.

Instaluj APK tylko ze strony Releases tego repozytorium. Każde wydanie jest
podpisane tym samym kluczem prywatnym, a Android odrzuca aktualizację
podpisaną innym kluczem. Kopia z innego źródła może być zmienioną aplikacją,
która zatrzymuje Twoje hasło.

Aby sprawdzić pobrany plik przed instalacją, porównaj jego certyfikat z
odciskiem SHA-256 podanym w opisie wydania:

```bash
apksigner verify --print-certs OpenLibrus.apk
```

## Prywatność i bezpieczeństwo

- Hasło jest zapisane przez `expo-secure-store`, zaszyfrowane kluczem w
  Android Keystore, do którego dostęp ma tylko ta aplikacja. Dane pobiera
  bezpośrednio z tego samego źródła co aplikacja Librus. Nie ma żadnego naszego
  serwera po drodze ani analityki.
- Dane szkolne i ciasteczko sesji Librusa zostają w prywatnej pamięci
  aplikacji. Kopie zapasowe Google i przenoszenie danych między telefonami
  (Android 12+) są dla tej aplikacji wyłączone (`plugins/withPrivacy.js`),
  więc tą drogą nic nie opuszcza telefonu.
- Cały ruch idzie przez HTTPS do `api.librus.pl` i `synergia.librus.pl`, plus
  raz dziennie jedno zapytanie do `api.github.com` o numer najnowszej wersji
  (możesz to wyłączyć na stronie Konto, jeśli chcesz). Linki w ogłoszeniach
  otwierają się w przeglądarce tylko wtedy, gdy są `http(s)`.
- Uprawnienia: internet, stan sieci i Wi-Fi (żeby odróżnić Wi-Fi od danych
  mobilnych), wibracje oraz to, czego potrzebują powiadomienia i sprawdzanie w
  tle (powiadomienia, uruchomienie po starcie telefonu, żeby przywrócić
  przypomnienia, blokada uśpienia, usługa WorkManagera). O powiadomienia
  Android pyta dopiero, gdy włączysz przypomnienia albo sprawdzanie w tle. Bez
  usługi push: każde powiadomienie powstaje w telefonie.
- „Konto” → „Wyloguj”: usuwa hasło, dane i ciasteczka sesji.

Telefon z rootem albo złośliwe oprogramowanie z uprawnieniami roota może
odczytać pamięć każdej aplikacji, także tej, rzecz jasna. Jeśli telefon jest
zhakowany, to po zawodach.

## Jak często łączy się z Librusem

Regulamin Synergii daje każdemu użytkownikowi dostęp do API dla zewnętrznych
aplikacji (§3 ust. 10) i zabrania pobierania danych na tyle intensywnego, że
mogłoby zdestabilizować serwery (§4 ust. 3 lit. c), pod groźbą zablokowania
konta. Blokada, nawet czasowa, oznacza utratę dostępu do dziennika w środku
roku szkolnego. Dlatego aplikacja wysyła tyle zapytań, ile wygenerowałaby
jedna osoba przeglądająca oficjalną aplikację:

- Jedno pobranie to zawsze 26 zapytań, razem z `Me`: 21 list, trzy tygodnie
  planu lekcji i szczęśliwy numerek. Nigdy jedno zapytanie na przedmiot czy
  na dzień.
- Przy uruchomieniu pobiera dane tylko wtedy, gdy kopia ma ponad 6 godzin.
  Ręczne odświeżenie działa najwyżej co 3 minuty. Dwa pobrania nigdy nie
  idą naraz.
- Sprawdzanie w tle jest wyłączone, dopóki nie włączysz go w zakładce Konto.
  Wtedy Android co 30, 60 albo 120 minut (albo rzadziej, żeby oszczędzać
  baterię) wykonuje sprawdzenie z 12 zapytań, tylko z internetem i nigdy
  między 22:00 a 6:00. Nowe oceny, wpisy, ogłoszenia, uwagi i zmiany w planie
  przychodzą jako powiadomienie.
- Przejście w kalendarzu do tygodnia spoza kopii kosztuje jedno zapytanie,
  jeden raz.
- Gdy Librus odrzuci zapisane hasło, aplikacja przestaje próbować, dopóki nie
  zalogujesz się ponownie.

Korzystasz na własną odpowiedzialność. Ryzyko jest jednak małe, wręcz
pomijalne. API nie jest udokumentowane i Librus
może je w każdej chwili zmienić albo sprzeciwić się nieoficjalnym aplikacjom.

## Zbuduj APK samodzielnie

Wymagania: Node 22 lub nowszy, JDK 17 i Android SDK (API 36), z ustawionymi
`JAVA_HOME` i `ANDROID_HOME`.

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install app/build/outputs/apk/release/app-release.apk
```

Katalog `android/` jest generowany (Continuous Native Generation w Expo) i
nie trafia do repozytorium. Ustawienia natywne są w `app.json` i w pluginach
w `plugins/`, nigdy w ręcznie edytowanym `android/`.

Bez skonfigurowanego klucza wydania są podpisywane publicznym kluczem
debugowym React Native. Do instalacji na własnym telefonie to wystarczy. Do
rozpowszechniania potrzebny jest klucz prywatny, opisany w
`plugins/withReleaseSigning.js`.

Wersja na iOS wymagałaby Maca albo budowania w chmurze EAS i nie była
próbowana.

Dokumentacja dla programistów jest po angielsku: praca nad interfejsem jest
opisana w [README.md](README.md#working-on-the-ui), a
[ARCHITECTURE.md](ARCHITECTURE.md) opisuje główny kod: od logowania po to, jak
działa aplikacja.

## Podziękowania

Logowanie jest przeniesione z
[librus-sdk](https://github.com/andrewkoltsov/librus-sdk) autorstwa Andreya
Koltsova (MIT). Ikony pochodzą z [Lucide](https://lucide.dev) (ISC).

## Licencja

[MIT](LICENSE).
