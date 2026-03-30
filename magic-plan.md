# Magic System Implementation TODO

Bu dosya, turn-based gladiator oyunu için planlanan **Magic System** özelliğinin adım adım uygulanması için hazırlanmış teknik TODO dokümanıdır.

Amaç:
- Magic sistemini mevcut combat yapısını bozmadan oyuna eklemek
- Büyüleri ana saldırı sisteminin yerine geçirmemek
- Magic'i taktiksel, sınırlı ve değerli bir kaynak olarak konumlandırmak
- Sistemi ileride genişletilebilir şekilde kurmak

---

## 1. Core Design Goals

- [x] Magic bar ekle
- [x] Oyuncunun mevcut ve maksimum magic değerlerini destekle
- [x] Yeterli magic yoksa büyü kullanımını engelle
- [x] Büyüleri mevcut combat seçeneklerinden biri haline getir
- [x] Mevcut normal/quick/power attack sistemini geçersiz kılma
- [x] Sistemi future-proof kur; ileride yeni büyüler kolay eklenebilsin

---

## 2. High-Level Rules

- [x] Magic, ayrı bir combat kaynağı olacak
- [x] Her spell belirli bir magic cost tüketecek
- [x] Oyuncu yalnızca yeterli magic varsa spell cast edebilecek
- [x] Combat başlangıcında currentMagic değeri düzgün initialize edilmeli
- [x] Her tur küçük miktarda magic regen olup olmayacağı netleştirilmeli
- [x] Güçlü büyüler için cooldown sistemi gerekip gerekmediği kararlaştırılmalı
- [ ] Magic sistemi hem PvE hem PvP ile uyumlu olmalı

---

## 3. Data Model Planning

### Player / Character Data
- [x] Karakter datasınaki `magicka` yı kullan.
- [x] `maxMagic` alanı ekle
- [x] `currentMagic` alanı ekle
- [x] Gerekirse `magicRegen` alanı ekle
- [x] Gerekirse `spellPower` alanı ekle
- [x] Gerekirse `magicResist` alanı ekle

### Combat Data
- [x] Combat state içinde `currentMagic` takibini destekle
- [x] Tur başında magic regen uygulanacaksa bunu combat loop'a ekle
- [x] Spell cooldown kullanılacaksa combat state'e cooldown alanları ekle

### Spell Data
- [x] Spell verilerini merkezi bir data/config yapısında tut
- [ ] Her spell için şu alanları belirle:
  - [x] `id`
  - [x] `name`
  - [x] `description`
  - [x] `magicCost`
  - [x] `type`
  - [x] `basePower`
  - [x] `statusEffect`
  - [x] `cooldown`
  - [x] `targetType`
  - [x] `unlockCondition` (gerekirse)

---

## 4. Magic Formula Decisions

Aşağıdaki formüller başlangıç önerisi olarak değerlendirilebilir:

- [x] `maxMagic = base + (magicStat * scale)`
- [x] `spellDamage = baseSpellPower + (magicStat * scale)`
- [x] `magicRegen = baseRegen + floor(magicStat / x)`

Karar verilmesi gerekenler:
- [x] Başlangıç base magic kaç olacak?
- [x] Turn başına regen olacak mı?
- [x] Regen çok düşük mü olmalı?
- [ ] PvP için ayrı denge gerekir mi?

---

## 5. Spell Categories

İlk sistem için büyüler şu ana kategorilerle düşünülmeli:

- [x] Direct Damage Spells
- [x] DOT / Debuff Spells
- [x] Defensive Spells
- [x] Cleanse / Recovery Spells
- [ ] Utility Spells

Amaç:
- [ ] Her büyüyü farklı taktiksel role sahip yapmak
- [ ] Tüm büyüleri sadece damage odaklı yapmamak
- [ ] Attack sisteminden farklı bir karar katmanı yaratmak

---

## 6. V1 Spell List

İlk sürüm için 4–6 spell yeterli.

### Önerilen başlangıç büyüleri
- [x] Fireball
  - [x] direct magic damage
  - [x] düşük burn chance veya sadece saf damage
- [x] Poison Cloud
  - [x] poison DOT uygular
- [x] Blood Hex
  - [x] bleed DOT uygular
- [x] Arcane Shield
  - [x] armor veya temporary shield verir
- [x] Cleanse
  - [x] oyuncudaki DOT etkilerinden birini veya belirli türleri kaldırır
- [x] Thunder Strike
  - [x] yüksek cost'lu burst spell

Her büyü için ayrıca karar ver:
- [x] düşük / orta / yüksek cost
- [x] cooldown gerekli mi
- [ ] resist edilebilir mi
- [x] direct damage mi status effect mi
- [x] tek hedef mi self-cast mi

---

## 7. UI / UX Tasks

### Combat UI
- [x] Combat ekranına Magic bar ekle
- [x] Magic değerini net ve okunabilir göster
- [x] Yetersiz magic varsa spell butonlarını disabled göster veya uyarı ver
- [x] Spell seçimi için basit ve temiz bir spell paneli oluştur
- [x] Spell açıklamalarını tooltip veya kısa text olarak göster

### General UI
- [ ] Character screen'de magic stat görünmeli mi karar ver
- [ ] Stat allocation ekranına magic stat eklenmeli mi karar ver
- [ ] Inventory/equipment ekranında magic bonusları gösterilecek mi karar ver

---

## 8. Combat Flow Integration

- [x] Combat action listesine yeni bir `Cast Spell` seçeneği ekle
- [x] Spell seçilince available spell listesi aç
- [ ] Spell seçimi sonrası:
  - [x] yeterli magic kontrol et
  - [x] cooldown kontrol et
  - [x] target uygun mu kontrol et
  - [x] spell effect uygula
  - [x] magic düş
  - [x] combat log üret
- [x] Tur sonu akışını bozmadığından emin ol
- [x] Spell kullanımını mevcut attack/item sistemleriyle uyumlu hale getir

---

## 9. Status Effect Integration

- [x] Mevcut DOT sistemi ile büyüleri entegre et
- [x] Yeni paralel status sistemi oluşturma
- [x] Fire/Bleed/Poison gibi efektler zaten varsa doğrudan reuse et
- [x] Spell ile eklenen status effect'lerin mevcut processing loop içinde çalıştığını doğrula
- [x] Cleanse tarzı büyüler mevcut status temizleme yapısıyla uyumlu olmalı

---

## 10. Balance Tasks

En kritik kısım: büyüler attack sistemini ezmemeli.

- [ ] Spell cost'ları dikkatli ayarla
- [ ] Direct damage spell'leri weapon attack'lardan güçlü ama spamlenemez hale getir
- [ ] DOT spell'lerinin stacking kurallarını netleştir
- [ ] Shield / heal / cleanse büyülerini aşırı güçlü yapma
- [ ] PvP'de spell spam ihtimalini test et
- [ ] PvE'de magic build'lerin anlamlı ama zorunlu olmayan seçenekler olduğundan emin ol

Denge hedefleri:
- [ ] Spell = güçlü ama sınırlı
- [ ] Attack = temel omurga
- [ ] Item = destekleyici taktik araç
- [ ] Magic = özel karar katmanı

---

## 11. Cooldown Decision

Karar verilmesi gereken konu:
- [ ] Tüm büyülerde cooldown olacak mı?
- [ ] Sadece güçlü büyülerde cooldown olacak mı?
- [ ] V1'de cooldown olmadan sadece magic cost ile başlanacak mı?

Öneri:
 - [ ] İlk sürümde önce yalnızca magic cost ile başla
 - [x] Gerekirse sadece burst spell'lere cooldown ekle

---

## 12. Regen Decision

Karar verilmesi gereken konu:
- [x] Combat sırasında turn başına magic regen olacak mı?
- [ ] Regen sadece bazı item/spell/gear ile mi olacak?
- [ ] Hiç regen olmayıp sadece başlangıç magic ile mi gidilecek?

Öneri:
- [x] Çok küçük turn-based regen ile başla
- [ ] Böylece sistem hiç kilitlenmez ama spam de olmaz

---

## 13. Equipment / Progression Integration

İleride eklenmek üzere plan:
- [ ] Magic bonus veren itemler
- [ ] Spell power veren staff/ring/charm tarzı ekipmanlar
- [ ] Magic regen itemleri
- [ ] Magic resist veren armor parçaları
- [ ] Büyü odaklı build yapılabilmesini destekleyen gear seçenekleri

V1 için karar:
- [x] İlk sürümde equipment bonusları eklenmeyecekse sade bırak
- [x] Önce base system çalışsın
- [ ] Sonra gear ile derinlik ekle

---

## 14. Unlock System Planning

Karar verilmesi gerekenler:
- [ ] Spell'ler başlangıçta açık mı olacak?
- [ ] Level ile mi açılacak?
- [ ] Shop / trainer / tome ile mi öğrenilecek?
- [ ] Hepsi aynı anda mı açık olacak?

V1 önerisi:
- [x] Test için ilk birkaç spell başlangıçta açık olabilir
- [ ] Sonradan unlock/progression sistemi eklenir

---

## 15. Spell Slot System (Optional / Later)

İleride desteklenebilir:

- [ ] Oyuncu çok sayıda spell öğrenir
- [ ] Ama savaşta sadece belirli sayıda spell equip eder
- [ ] Spell slot sistemi build çeşitliliği sağlar

V1 için:
- [x] Şimdilik slot sistemi olmadan başlanabilir
- [ ] Sonra spell loadout sistemi eklenebilir

---

## 16. Combat Log / Feedback Tasks

- [x] Her spell için net combat log mesajları yaz
- [x] Damage büyülerinde hasar miktarını göster
- [x] Status effect uygulandıysa belirt
- [ ] Resist olduysa belirt
- [x] Yetersiz magic varsa net mesaj ver
- [x] Cooldown varsa net mesaj ver
- [x] Shield/cleanse etkileri anlaşılır olsun

Örnek mesajlar:
- [ ] "You cast Fireball and dealt 18 magic damage."
- [ ] "You cast Poison Cloud and poisoned the enemy."
- [ ] "You cast Arcane Shield and gained 12 armor."
- [ ] "Not enough Magic."
- [ ] "Thunder Strike is on cooldown."

---

## 17. AI / Enemy Support (Later or Partial)

Karar ver:
- [ ] İlk sürümde sadece player mı spell kullanacak?
- [ ] Bazı enemy tipleri de spell kullanacak mı?

Öneri:
- [x] V1'de önce sadece player spells
- [ ] Sistem stabil olunca magic enemy'ler eklenir

---

## 18. PvP Considerations

- [ ] PvP'de burst spell'lerin aşırı güçlü olup olmadığını test et
- [ ] DOT + weapon combo'ları kontrol et
- [ ] Cleanse büyüsünün DOT buildlerini tamamen bozmamasına dikkat et
- [ ] Magic build vs physical build dengesi test edilmeli
- [ ] Gerekirse PvP için ayrı tuning layer düşünülmeli

---

## 19. Dungeon Synergy Tasks

Magic sistemi dungeon crawling ile iyi çalışmalı.

- [ ] Dungeon'da magic management anlamlı olmalı
- [ ] Büyüler sadece combat değil stratejik hazırlık hissi de vermeli
- [ ] Cleanse / shield / burst / DOT büyüleri dungeon koşularında farklı roller oynamalı
- [ ] İleride utility dungeon spells düşünülebilir:
  - [ ] trap reveal
  - [ ] scouting
  - [ ] temporary resistance
  - [ ] route advantage

V1 için:
- [x] Önce combat magic sistemi tamamlanmalı
- [ ] Sonra dungeon utility spell fikirleri eklenmeli

---

## 20. Implementation Order

### Faz 1 — Foundations
- [x] Magic stat/data modelini ekle
- [x] Max/current magic hesaplarını kur
- [x] Combat state'e current magic desteği ekle

### Faz 2 — UI
- [x] Magic bar ekle
- [x] Spell menüsü ekle
- [x] Basic feedback mesajları ekle

### Faz 3 — Core Spell System
- [x] Spell config/data yapısını oluştur
- [x] Spell cast action sistemini kur
- [x] Magic cost düşümü ekle
- [x] Combat log entegrasyonu yap

### Faz 4 — V1 Spells
- [x] Fireball
- [x] Poison Cloud
- [x] Blood Hex
- [x] Arcane Shield
- [x] Cleanse
- [x] Thunder Strike

### Faz 5 — Tuning
- [ ] cost balance
- [ ] damage balance
- [ ] DOT chance balance
- [ ] regen balance
- [ ] cooldown balance (gerekirse)

### Faz 6 — Expansion
- [ ] equipment integration
- [ ] unlock system
- [ ] enemy spellcasters
- [ ] magic shop / tomes / mana potions
- [ ] spell slots

---

## 21. Technical Cleanliness Checklist

- [x] Spell logic tek yerde toplanmalı
- [ ] Hardcode if/else zincirlerinden kaçınılmalı
- [ ] Spell effect resolution mümkün olduğunca data-driven olmalı
- [x] Combat code içinde büyü desteği modüler olmalı
- [x] UI ve combat logic birbirine çok sıkı bağlanmamalı
- [ ] İleride yeni spell eklemek için tek dosyada config genişletmek yeterli olmalı

---

## 22. Minimum Viable Magic System Definition

Bir sistemin "çalışıyor" sayılması için minimum gereklilikler:

- [x] Magic bar görünür
- [x] Oyuncunun current/max magic değeri var
- [x] En az 3 spell kullanılabiliyor
- [x] Spell cast etmek magic harcıyor
- [x] Yetersiz magic engelleniyor
- [x] En az 1 damage spell çalışıyor
- [x] En az 1 DOT spell çalışıyor
- [x] En az 1 defensive/cleanse spell çalışıyor
- [x] Combat log düzgün bilgi veriyor
- [x] Mevcut attack sistemi bozulmuyor

---

## 23. Nice-to-Have Later

- [ ] Mana potion
- [ ] Arcane shop
- [ ] Elemental resistances
- [ ] Spell animations / lightweight VFX
- [ ] Enemy spellcasters
- [ ] Rare spell tomes
- [ ] Spell rarity
- [ ] Hybrid class identities
- [ ] Magic-focused tournaments
- [ ] Dungeon-only utility spells

---

## 24. Final Reminder

Bu sistemi kurarken en önemli ilke:

**Magic, combat'ı daha derin yapmalı; mevcut sistemi geçersiz kılmamalı.**

Yani hedef:
- warrior/weapon identity kaybolmasın
- magic güçlü ama sınırlı olsun
- oyuncuya yeni kararlar sunsun
- dungeon, PvE ve PvP'yi daha ilginç hale getirsin

Şimdilik odak:
- sade V1
- temiz mimari
- doğru entegrasyon
- sonra içerik genişletme

---
