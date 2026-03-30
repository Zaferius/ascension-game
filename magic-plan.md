# Magic System Implementation TODO

Bu dosya, turn-based gladiator oyunu için planlanan **Magic System** özelliğinin adım adım uygulanması için hazırlanmış teknik TODO dokümanıdır.

Amaç:
- Magic sistemini mevcut combat yapısını bozmadan oyuna eklemek
- Büyüleri ana saldırı sisteminin yerine geçirmemek
- Magic'i taktiksel, sınırlı ve değerli bir kaynak olarak konumlandırmak
- Sistemi ileride genişletilebilir şekilde kurmak

---

## 1. Core Design Goals

- [ ] Magic bar ekle
- [ ] Oyuncunun mevcut ve maksimum magic değerlerini destekle
- [ ] Yeterli magic yoksa büyü kullanımını engelle
- [ ] Büyüleri mevcut combat seçeneklerinden biri haline getir
- [ ] Mevcut normal/quick/power attack sistemini geçersiz kılma
- [ ] Sistemi future-proof kur; ileride yeni büyüler kolay eklenebilsin

---

## 2. High-Level Rules

- [ ] Magic, ayrı bir combat kaynağı olacak
- [ ] Her spell belirli bir magic cost tüketecek
- [ ] Oyuncu yalnızca yeterli magic varsa spell cast edebilecek
- [ ] Combat başlangıcında currentMagic değeri düzgün initialize edilmeli
- [ ] Her tur küçük miktarda magic regen olup olmayacağı netleştirilmeli
- [ ] Güçlü büyüler için cooldown sistemi gerekip gerekmediği kararlaştırılmalı
- [ ] Magic sistemi hem PvE hem PvP ile uyumlu olmalı

---

## 3. Data Model Planning

### Player / Character Data
- [ ] Karakter datasınaki `magicka` yı kullan.
- [ ] `maxMagic` alanı ekle
- [ ] `currentMagic` alanı ekle
- [ ] Gerekirse `magicRegen` alanı ekle
- [ ] Gerekirse `spellPower` alanı ekle
- [ ] Gerekirse `magicResist` alanı ekle

### Combat Data
- [ ] Combat state içinde `currentMagic` takibini destekle
- [ ] Tur başında magic regen uygulanacaksa bunu combat loop'a ekle
- [ ] Spell cooldown kullanılacaksa combat state'e cooldown alanları ekle

### Spell Data
- [ ] Spell verilerini merkezi bir data/config yapısında tut
- [ ] Her spell için şu alanları belirle:
  - [ ] `id`
  - [ ] `name`
  - [ ] `description`
  - [ ] `magicCost`
  - [ ] `type`
  - [ ] `basePower`
  - [ ] `statusEffect`
  - [ ] `cooldown`
  - [ ] `targetType`
  - [ ] `unlockCondition` (gerekirse)

---

## 4. Magic Formula Decisions

Aşağıdaki formüller başlangıç önerisi olarak değerlendirilebilir:

- [ ] `maxMagic = base + (magicStat * scale)`
- [ ] `spellDamage = baseSpellPower + (magicStat * scale)`
- [ ] `magicRegen = baseRegen + floor(magicStat / x)`

Karar verilmesi gerekenler:
- [ ] Başlangıç base magic kaç olacak?
- [ ] Turn başına regen olacak mı?
- [ ] Regen çok düşük mü olmalı?
- [ ] PvP için ayrı denge gerekir mi?

---

## 5. Spell Categories

İlk sistem için büyüler şu ana kategorilerle düşünülmeli:

- [ ] Direct Damage Spells
- [ ] DOT / Debuff Spells
- [ ] Defensive Spells
- [ ] Cleanse / Recovery Spells
- [ ] Utility Spells

Amaç:
- [ ] Her büyüyü farklı taktiksel role sahip yapmak
- [ ] Tüm büyüleri sadece damage odaklı yapmamak
- [ ] Attack sisteminden farklı bir karar katmanı yaratmak

---

## 6. V1 Spell List

İlk sürüm için 4–6 spell yeterli.

### Önerilen başlangıç büyüleri
- [ ] Fireball
  - [ ] direct magic damage
  - [ ] düşük burn chance veya sadece saf damage
- [ ] Poison Cloud
  - [ ] poison DOT uygular
- [ ] Blood Hex
  - [ ] bleed DOT uygular
- [ ] Arcane Shield
  - [ ] armor veya temporary shield verir
- [ ] Cleanse
  - [ ] oyuncudaki DOT etkilerinden birini veya belirli türleri kaldırır
- [ ] Thunder Strike
  - [ ] yüksek cost'lu burst spell

Her büyü için ayrıca karar ver:
- [ ] düşük / orta / yüksek cost
- [ ] cooldown gerekli mi
- [ ] resist edilebilir mi
- [ ] direct damage mi status effect mi
- [ ] tek hedef mi self-cast mi

---

## 7. UI / UX Tasks

### Combat UI
- [ ] Combat ekranına Magic bar ekle
- [ ] Magic değerini net ve okunabilir göster
- [ ] Yetersiz magic varsa spell butonlarını disabled göster veya uyarı ver
- [ ] Spell seçimi için basit ve temiz bir spell paneli oluştur
- [ ] Spell açıklamalarını tooltip veya kısa text olarak göster

### General UI
- [ ] Character screen'de magic stat görünmeli mi karar ver
- [ ] Stat allocation ekranına magic stat eklenmeli mi karar ver
- [ ] Inventory/equipment ekranında magic bonusları gösterilecek mi karar ver

---

## 8. Combat Flow Integration

- [ ] Combat action listesine yeni bir `Cast Spell` seçeneği ekle
- [ ] Spell seçilince available spell listesi aç
- [ ] Spell seçimi sonrası:
  - [ ] yeterli magic kontrol et
  - [ ] cooldown kontrol et
  - [ ] target uygun mu kontrol et
  - [ ] spell effect uygula
  - [ ] magic düş
  - [ ] combat log üret
- [ ] Tur sonu akışını bozmadığından emin ol
- [ ] Spell kullanımını mevcut attack/item sistemleriyle uyumlu hale getir

---

## 9. Status Effect Integration

- [ ] Mevcut DOT sistemi ile büyüleri entegre et
- [ ] Yeni paralel status sistemi oluşturma
- [ ] Fire/Bleed/Poison gibi efektler zaten varsa doğrudan reuse et
- [ ] Spell ile eklenen status effect'lerin mevcut processing loop içinde çalıştığını doğrula
- [ ] Cleanse tarzı büyüler mevcut status temizleme yapısıyla uyumlu olmalı

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
- [ ] Gerekirse sadece burst spell'lere cooldown ekle

---

## 12. Regen Decision

Karar verilmesi gereken konu:
- [ ] Combat sırasında turn başına magic regen olacak mı?
- [ ] Regen sadece bazı item/spell/gear ile mi olacak?
- [ ] Hiç regen olmayıp sadece başlangıç magic ile mi gidilecek?

Öneri:
- [ ] Çok küçük turn-based regen ile başla
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
- [ ] İlk sürümde equipment bonusları eklenmeyecekse sade bırak
- [ ] Önce base system çalışsın
- [ ] Sonra gear ile derinlik ekle

---

## 14. Unlock System Planning

Karar verilmesi gerekenler:
- [ ] Spell'ler başlangıçta açık mı olacak?
- [ ] Level ile mi açılacak?
- [ ] Shop / trainer / tome ile mi öğrenilecek?
- [ ] Hepsi aynı anda mı açık olacak?

V1 önerisi:
- [ ] Test için ilk birkaç spell başlangıçta açık olabilir
- [ ] Sonradan unlock/progression sistemi eklenir

---

## 15. Spell Slot System (Optional / Later)

İleride desteklenebilir:

- [ ] Oyuncu çok sayıda spell öğrenir
- [ ] Ama savaşta sadece belirli sayıda spell equip eder
- [ ] Spell slot sistemi build çeşitliliği sağlar

V1 için:
- [ ] Şimdilik slot sistemi olmadan başlanabilir
- [ ] Sonra spell loadout sistemi eklenebilir

---

## 16. Combat Log / Feedback Tasks

- [ ] Her spell için net combat log mesajları yaz
- [ ] Damage büyülerinde hasar miktarını göster
- [ ] Status effect uygulandıysa belirt
- [ ] Resist olduysa belirt
- [ ] Yetersiz magic varsa net mesaj ver
- [ ] Cooldown varsa net mesaj ver
- [ ] Shield/cleanse etkileri anlaşılır olsun

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
- [ ] V1'de önce sadece player spells
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
- [ ] Önce combat magic sistemi tamamlanmalı
- [ ] Sonra dungeon utility spell fikirleri eklenmeli

---

## 20. Implementation Order

### Faz 1 — Foundations
- [ ] Magic stat/data modelini ekle
- [ ] Max/current magic hesaplarını kur
- [ ] Combat state'e current magic desteği ekle

### Faz 2 — UI
- [ ] Magic bar ekle
- [ ] Spell menüsü ekle
- [ ] Basic feedback mesajları ekle

### Faz 3 — Core Spell System
- [ ] Spell config/data yapısını oluştur
- [ ] Spell cast action sistemini kur
- [ ] Magic cost düşümü ekle
- [ ] Combat log entegrasyonu yap

### Faz 4 — V1 Spells
- [ ] Fireball
- [ ] Poison Cloud
- [ ] Blood Hex
- [ ] Arcane Shield
- [ ] Cleanse
- [ ] Thunder Strike

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

- [ ] Spell logic tek yerde toplanmalı
- [ ] Hardcode if/else zincirlerinden kaçınılmalı
- [ ] Spell effect resolution mümkün olduğunca data-driven olmalı
- [ ] Combat code içinde büyü desteği modüler olmalı
- [ ] UI ve combat logic birbirine çok sıkı bağlanmamalı
- [ ] İleride yeni spell eklemek için tek dosyada config genişletmek yeterli olmalı

---

## 22. Minimum Viable Magic System Definition

Bir sistemin "çalışıyor" sayılması için minimum gereklilikler:

- [ ] Magic bar görünür
- [ ] Oyuncunun current/max magic değeri var
- [ ] En az 3 spell kullanılabiliyor
- [ ] Spell cast etmek magic harcıyor
- [ ] Yetersiz magic engelleniyor
- [ ] En az 1 damage spell çalışıyor
- [ ] En az 1 DOT spell çalışıyor
- [ ] En az 1 defensive/cleanse spell çalışıyor
- [ ] Combat log düzgün bilgi veriyor
- [ ] Mevcut attack sistemi bozulmuyor

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
