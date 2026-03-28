# Gladiator World Server Plan

Bu doküman, web tabanlı turn-based gladiator oyununun **singleplayer tamamen bittikten sonra** eklenecek olan **persistent multiplayer world** sistemi için yüksek seviye planıdır.

---

## 1. Ana Vizyon

Oyuncular artık sadece oda bazlı maçlara girmeyecek. Bunun yerine tek bir **sunucu tarafında yaşayan dünya** olacak.

Bu dünya içinde:

- tüm oyuncular aynı world'e bağlanacak
- market bütün oyuncular için ortak mantıkla çalışacak
- item generation sunucu tarafında yapılacak
- oyuncular karakterlerini bu dünyada geliştirecek
- isteyen oyuncular birbirini 1v1 düelloya çağırabilecek
- isteyen oyuncular **The Pit** içinde PvE savaşlarla kasılabilecek
- savaş sonuçları, ekonomi ve progression sunucu otoritesinde tutulacak

> Not: Dünya artık bir oyuncunun host olduğu yapı olmayacak. Dünya tamamen **server-side authoritative** çalışacak.

---

## 2. Neden Host Yerine Dedicated Server?

Bu sistemin host tabanlı olmaması gerekiyor çünkü:

- host çıkarsa dünya kapanmamalı
- shared market güvenilir olmalı
- item generation manipüle edilmemeli
- PvP sonuçları client tarafında hesaplanmamalı
- persistent karakter verisi korunmalı
- disconnect ve reconnect daha düzgün yönetilmeli

Bu yüzden yapı şu olacak:

- **Client:** Browser'daki oyun
- **Server:** World state + combat logic + synchronization
- **Database:** Kalıcı karakter ve dünya verisi

---

## 3. Genel Mimari

### Client
Tarayıcıda çalışan kısım yalnızca şunlardan sorumlu olacak:

- UI
- ekranlar
- combat log gösterimi
- avatarlar, HP/armor barları
- input toplama
- websocket mesajlarını dinleme
- animasyon/presentation

### Server
Oyunun gerçek beyni burada olacak:

- world state
- online players
- market state
- combat instances
- Pit encounters
- duel invites
- turn order validation
- damage / crit / dodge / block hesapları
- reward calculation
- anti-cheat validation

### Database
Kalıcı veri burada tutulacak:

- hesaplar
- karakterler
- statlar
- inventory
- equipment
- gold/xp
- progression
- save/load sistemi

---

## 4. Ana Tasarım Kuralı

### Client asla sonucu belirlememeli
Client sadece komut göndermeli.

Örnek:
- Client: `quick_attack`
- Server:
  - sıra bu oyuncuda mı kontrol eder
  - combat state valid mi kontrol eder
  - damage hesaplar
  - armor / HP günceller
  - iki tarafa da yeni state gönderir

Yanlış yaklaşım:
- client “53 damage vurdum” der

Doğru yaklaşım:
- client “quick attack yapmak istiyorum” der
- sonucu server belirler

---

## 5. World ve Combat Ayrımı

Bu proje için en kritik mimari kararlardan biri:

### World state ayrı
Dünya şunları tutar:
- online oyuncular
- global market
- oyuncu progression
- açık davetler
- genel etkinlikler
- oyuncuların mevcut durumları

### Combat instance ayrı
Bir savaş başladığında ayrı bir combat instance açılır:
- pit savaşı
- 1v1 düello
- ileride tournament match

Bu sayede:
- dünya temiz kalır
- savaş mantığı bağımsız olur
- bir oyuncu world içinde yaşarken gerektiğinde combat instance'a girer

Özet:
- **World = hub / persistent layer**
- **Combat = temporary instance layer**

---

## 6. Oyuncu State Sistemi

Her oyuncunun o anda bulunduğu durum net olmalı.

Önerilen state'ler:

- `offline`
- `idle_in_world`
- `in_market`
- `pit_queue`
- `in_pit_combat`
- `duel_invite_pending`
- `in_duel_combat`
- `in_tournament_combat`
- `disconnected_reconnectable`

Bu state machine bug önlemek için çok önemli.

Örnek sorunlar:
- marketteyken düelloya girmek
- combat içindeyken item almak
- aynı anda iki savaşa girmek
- disconnect sonrası state bozulması

---

## 7. İlk Multiplayer World Versiyonu İçin Hedef (V1)

İlk büyük hedef devasa MMO yapmak değil. Sadece çalışan bir persistent world foundation kurmak.

### V1 Özellikleri
- oyuncu login / connect
- world'e giriş
- online oyuncu listesi
- shared market
- the pit'e giriş
- pitten ödül kazanma
- başka oyuncuya duel invite atma
- 1v1 combat instance
- savaş sonunda reward/result ekranı
- karakter progress'inin kaydedilmesi

Bu sürüm yeterli. Fazlası sonra eklenecek.

---

## 8. V2 ve Sonrası

### V2
- market refresh timer
- global announcements
- rare item spawn mantığı
- basit leaderboard
- reconnect sistemi iyileştirmeleri

### V3
- tournament registration
- betting sistemi
- world events
- ranked ladder
- sezon sistemi
- belki clan / guild benzeri yapılar

---

## 9. Market Sistemi Notları

Market bütün oyuncular için aynı mantıkla çalışmalı.

Temel seçenekler:

### Seçenek A — Tam Shared Market
- herkes aynı itemleri görür
- biri alınca item marketten düşer

Avantaj:
- dünya hissi çok güçlü

Dezavantaj:
- bazı oyuncular item kaçırdığı için sinir olabilir

### Seçenek B — Aynı Seed, Kişisel Stok
- herkes aynı market roll mantığını görür
- ama item stokları kişisel olur

Avantaj:
- daha az sinir bozucu

Dezavantaj:
- shared world hissi azalır

### Seçenek C — Hibrit
- common itemler herkese açık
- rare itemler limited/shared olabilir
- ya da tersi tasarlanabilir

> Şu an için tasarım aşamasında düşünülmeli. İlk versiyon için en basit ve temiz model seçilmeli.

---

## 10. The Pit Sistemi Notları

The Pit, world içinden başlatılan bir PvE progression alanı olacak.

Akış:
1. oyuncu Pit'e girer
2. server oyuncu için NPC combat instance oluşturur
3. savaş server authoritative çözülür
4. sonuç world state'e geri yazılır
5. oyuncu XP / gold / loot kazanır

Önemli:
- Pit savaşı world'ün içinde yaşanan ayrı bir instance'tır
- world ile combat state birbirine karıştırılmamalı

---

## 11. 1v1 Duel Sistemi Notları

Akış:
1. oyuncu başka bir oyuncuya invite yollar
2. karşı taraf kabul eder
3. iki oyuncu normal world state'ten çıkarılıp combat instance'a alınır
4. savaş bitince sonuçlar world'e geri yazılır
5. iki oyuncu tekrar world state'e döner

Gereken kurallar:
- combat içindeki oyuncuya tekrar duel atılamaz
- markette işlem yaparken combat başlatılamaz
- disconnect durumları açık kurallara bağlanmalı
- surrender / timeout kuralları sonradan eklenebilir

---

## 12. Server Modülleri İçin Taslak Yapı

Önerilen server modülleri:

- `WorldManager`
- `PlayerManager`
- `SessionManager`
- `MarketManager`
- `CombatManager`
- `PitManager`
- `DuelManager`
- `RewardManager`
- `PersistenceManager`

### Kısa açıklamalar

#### WorldManager
- genel world state'i tutar
- online oyuncuları takip eder
- global eventleri yönetir

#### PlayerManager
- oyuncu state'lerini yönetir
- stat, inventory, progression akışını koordine eder

#### SessionManager
- websocket bağlantıları
- connect / disconnect / reconnect mantığı

#### MarketManager
- market item listeleri
- refresh sistemi
- satın alma validation

#### CombatManager
- turn-based combat çözümü
- attack resolution
- combat state sync

#### PitManager
- PvE savaş giriş akışı
- NPC rakip üretimi / seçimi
- Pit reward mantığı

#### DuelManager
- invite gönderme
- accept/reject
- duel instance başlatma

#### RewardManager
- XP / gold / loot dağıtımı
- sonuç sonrası progression

#### PersistenceManager
- save / load
- database entegrasyonu

---

## 13. Event Driven Yapı Fikri

Server tarafı event-driven düşünülmeli.

Örnek eventler:
- `player_connected`
- `player_joined_world`
- `player_disconnected`
- `market_refreshed`
- `item_purchased`
- `pit_requested`
- `pit_started`
- `duel_invited`
- `duel_accepted`
- `combat_started`
- `combat_action_submitted`
- `combat_turn_resolved`
- `combat_ended`
- `reward_granted`

Bu yaklaşım büyütürken çok rahatlatır.

---

## 14. Persistence İçin Veritabanı Notları

Singleplayer bittikten sonra multiplayer world'e geçerken mutlaka kalıcı veri şart.

İlk aşamada tutulması gereken temel veriler:

### Accounts
- user id
- username
- auth info (ileride)

### Characters
- character id
- owner user id
- name
- level
- xp
- gold
- base stats

### Inventory
- hangi itemler oyuncuda var
- stack / quantity gerekiyorsa
- equip durumu

### Equipment
- hangi slotta hangi item takılı

### Combat / Progression Related
- current hp/armor kalıcı tutulacak mı karar verilmeli
- pit progress
- tournament progress sonradan

### Market
- market snapshot tutulacak mı?
- refresh timestamp
- global seed gerekiyorsa

> İlk versiyon için fazla karmaşık tabloya gerek yok. Temel progression ve inventory yeterli.

---

## 15. Disconnect / Reconnect Notları

Bu sistem için erken düşünülmesi gereken önemli konulardan biri.

Senaryolar:
- oyuncu world içinde disconnect oldu
- oyuncu duel sırasında disconnect oldu
- oyuncu pit savaşında disconnect oldu

İlk versiyon için basit kurallar yeterli olabilir:

### World içinde disconnect
- oyuncu offline olur
- reconnect edince tekrar world'e döner

### Duel sırasında disconnect
- belirli süre reconnect hakkı verilebilir
- süre dolarsa mağlubiyet sayılabilir

### Pit sırasında disconnect
- combat iptal olabilir veya kayıp sayılabilir
- tasarım kararı sonradan netleşebilir

---

## 16. Geliştirme Sırası

Singleplayer bittikten sonra multiplayer world sistemi şu sırayla geliştirilmeli:

### Faz 1 — Temel Server Altyapısı
- websocket server temizlenir
- client/server message contract netleştirilir
- basic session sistemi kurulur

### Faz 2 — World Foundation
- oyuncular server'a bağlanır
- world'e giriş yapılır
- online player listesi görünür
- player state machine çalışır

### Faz 3 — Shared Systems
- market server side yapılır
- item satın alma validation eklenir
- persistence başlar

### Faz 4 — Combat Instances
- duel sistemi
- pit sistemi
- combat server authoritative hale gelir

### Faz 5 — Save / Load + Stabilizasyon
- database entegrasyonu
- reconnect kuralları
- result/reward akışı
- bug fixing

### Faz 6 — Genişleme
- tournaments
- rare item systems
- leaderboards
- announcements
- world flavor systems

---

## 17. Şimdiden Unutulmaması Gerekenler

Singleplayer geliştirirken multiplayer geçişini kolaylaştırmak için şunlara dikkat edilmeli:

- combat logic mümkün olduğunca modüler tutulmalı
- UI ile game logic birbirinden ayrılmalı
- item/stat/combat verileri veri odaklı tutulmalı
- tek bir yerde hesaplanan sistemler tercih edilmeli
- client tarafında kritik hesaplara fazla bağımlı olunmamalı
- state transition'lar açık ve kontrollü tutulmalı

Bu sayede singleplayer combat sistemi daha sonra server tarafına taşınabilir veya uyarlanabilir.

---

## 18. Nihai Hedef Cümlesi

Bu proje klasik oda bazlı bir PvP oyunu değil.

Hedef:
**browser üzerinde çalışan, hafif görselli ama derin mekanikli, persistent online gladiator world kurmak.**

Oyuncular:
- karakter kasacak
- shared world ekonomisinde yaşayacak
- The Pit'te PvE yapacak
- birbirlerine 1v1 düello atacak
- zamanla turnuvalara katılacak

Ve bütün bunların merkezi:
**server-side authoritative world architecture** olacak.

---

## 19. Son Not

Şu an öncelik:
**Singleplayer'ı tamamen bitirmek.**

Bu doküman, ondan sonraki büyük faz için referans olarak tutulacak.

Multiplayer world sistemi geliştirilirken:
- önce basit
- sonra stabil
- sonra genişleyen

bir yaklaşım izlenmeli.

Büyük hedef çok iyi, ama uygulama aşaması katman katman ilerlemeli.
