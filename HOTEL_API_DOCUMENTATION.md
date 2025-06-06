# Dokumentasi API Sistem HotelEase

Dokumen ini menyediakan informasi mengenai cara berinteraksi dengan API GraphQL dari layanan-layanan sistem HotelEase.

## Informasi Umum

Semua layanan mengekspos endpoint GraphQL pada path `/graphql`.

**URL Basis untuk Akses API:**

Untuk mengakses API dari jaringan lokal (misalnya, antar kelompok dalam satu jaringan kampus/Wi-Fi yang sama), gunakan IP address mesin yang menjalankan layanan dan port yang sesuai.

- **Guest Service:** `http://<GUEST_SERVICE_HOST_IP>:<GUEST_SERVICE_HOST_PORT>/graphql`
- **Room Service:** `http://<ROOM_SERVICE_HOST_IP>:<ROOM_SERVICE_HOST_PORT>/graphql`
- **Reservation Service:** `http://<RESERVATION_SERVICE_HOST_IP>:<RESERVATION_SERVICE_HOST_PORT>/graphql`
- **Billing Service:** `http://<BILLING_SERVICE_HOST_IP>:<BILLING_SERVICE_HOST_PORT>/graphql`

**Port Host Standar (dapat dikonfigurasi di `docker-compose.yml`):**
- Guest Service Port: `8003`
- Room Service Port: `8001`
- Reservation Service Port: `8002`
- Billing Service Port: `8004`

**Contoh URL Lengkap (jika Guest Service berjalan di IP `192.168.1.10` dengan port `8003`):**
`http://192.168.1.10:8003/graphql`

**Catatan Penting untuk Pengguna API:**
- Pastikan untuk mendapatkan IP address (`<SERVICE_HOST_IP>`) yang benar dari tim yang menjalankan layanan HotelEase.
- IP address lokal dapat berubah jika jaringan menggunakan DHCP. Selalu konfirmasi IP terbaru jika terjadi masalah koneksi.
- Pastikan tidak ada firewall yang memblokir koneksi pada port yang dituju.
- Semua field dan nama operasi GraphQL menggunakan `camelCase`.

---

## 1. Guest Service

**Endpoint:** `http://<GUEST_SERVICE_HOST_IP>:8003/graphql`

### Queries

- **`guest(id: Int!) -> GuestType`**: Mengambil detail tamu berdasarkan ID.
  **Contoh Query:**
  ```graphql
  query GetGuest($guestId: Int!) {
    guest(id: $guestId) {
      id
      fullName
      email
      phone
      address
    }
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "guestId": 1
  }
  ```

- **`guests -> [GuestType]`**: Mengambil daftar semua tamu.
  **Contoh Query:**
  ```graphql
  query GetAllGuests {
    guests {
      id
      fullName
      email
      phone
      address
    }
  }
  ```
  *(Query ini tidak memerlukan variabel.)*

- **`guestByEmail(email: String!) -> GuestType`**: Mengambil detail tamu berdasarkan alamat email.
  **Contoh Query:**
  ```graphql
  query GetGuestByEmail($email: String!) {
    guestByEmail(email: $email) {
      id
      fullName
      email
      phone
      address
    }
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "email": "contoh@email.com"
  }
  ```

### Mutations

- **`createGuest(guestData: GuestInput!) -> GuestType`**: Membuat tamu baru.
  **Contoh Mutasi:**
  ```graphql
  mutation CreateNewGuest($guestData: GuestInput!) {
    createGuest(guestData: $guestData) {
      id
      fullName
      email
      phone
      address
    }
  }
  ```
  **Definisi Input `GuestInput`:**
  ```graphql
  input GuestInput {
    fullName: String!
    email: String!
    phone: String!
    address: String!
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "guestData": {
      "fullName": "Nama Lengkap Baru",
      "email": "baru@example.com",
      "phone": "081234567890",
      "address": "Alamat Baru No. 1"
    }
  }
  ```

- **`updateGuest(id: Int!, guestData: GuestUpdateInput!) -> GuestType`**: Memperbarui informasi tamu berdasarkan ID.
  **Contoh Mutasi:**
  ```graphql
  mutation UpdateExistingGuest($guestId: Int!, $guestData: GuestUpdateInput!) {
    updateGuest(id: $guestId, guestData: $guestData) {
      id
      fullName
      email
      phone
      address
    }
  }
  ```
  **Definisi Input `GuestUpdateInput`:**
  ```graphql
  input GuestUpdateInput {
    fullName: String
    email: String
    phone: String
    address: String
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "guestId": 1,
    "guestData": {
      "fullName": "Nama Diperbarui",
      "email": "diperbarui@example.com"
    }
  }
  ```

- **`deleteGuest(id: Int!) -> Boolean`**: Menghapus tamu berdasarkan ID. Mengembalikan `true` jika berhasil, `false` jika tidak.
  **Contoh Mutasi:**
  ```graphql
  mutation DeleteExistingGuest($guestId: Int!) {
    deleteGuest(id: $guestId)
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "guestId": 1
  }
  ```

---

## 2. Room Service

**Endpoint:** `http://<ROOM_SERVICE_HOST_IP>:8001/graphql`

### Queries

- **`room(id: Int!) -> RoomType`**: Mengambil detail kamar berdasarkan ID.
  **Contoh Query:**
  ```graphql
  query GetRoom($roomId: Int!) {
    room(id: $roomId) {
      id
      roomNumber
      roomType
      pricePerNight
      status
    }
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "roomId": 101
  }
  ```

- **`rooms -> [RoomType]`**: Mengambil daftar semua kamar.
  **Contoh Query:**
  ```graphql
  query GetAllRooms {
    rooms {
      id
      roomNumber
      roomType
      pricePerNight
      status
    }
  }
  ```
  *(Query ini tidak memerlukan variabel.)*

- **`availableRooms -> [RoomType]`**: Mengambil daftar kamar yang tersedia (status 'available').
  **Contoh Query:**
  ```graphql
  query GetAvailableRooms {
    availableRooms {
      id
      roomNumber
      roomType
      pricePerNight
      status
    }
  }
  ```
  *(Query ini tidak memerlukan variabel.)*

### Mutations

- **`createRoom(roomData: RoomInput!) -> RoomType`**: Membuat kamar baru.
  **Contoh Mutasi:**
  ```graphql
  mutation CreateNewRoom($roomData: RoomInput!) {
    createRoom(roomData: $roomData) {
      id
      roomNumber
      roomType
      pricePerNight
      status
    }
  }
  ```
  **Definisi Input `RoomInput`:**
  ```graphql
  input RoomInput {
    roomNumber: String!
    roomType: String!
    pricePerNight: Float!
    status: String! # Contoh: "available", "occupied", "maintenance"
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "roomData": {
      "roomNumber": "101",
      "roomType": "Deluxe",
      "pricePerNight": 1500000.0,
      "status": "available"
    }
  }
  ```

- **`updateRoom(id: Int!, roomData: RoomUpdateInput!) -> RoomType`**: Memperbarui informasi kamar berdasarkan ID.
  **Contoh Mutasi:**
  ```graphql
  mutation UpdateExistingRoom($roomId: Int!, $roomData: RoomUpdateInput!) {
    updateRoom(id: $roomId, roomData: $roomData) {
      id
      roomNumber
      roomType
      pricePerNight
      status
    }
  }
  ```
  **Definisi Input `RoomUpdateInput`:**
  ```graphql
  input RoomUpdateInput {
    roomNumber: String
    roomType: String
    pricePerNight: Float
    status: String
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "roomId": 101,
    "roomData": {
      "pricePerNight": 1600000.0,
      "status": "maintenance"
    }
  }
  ```

- **`deleteRoom(id: Int!) -> Boolean`**: Menghapus kamar berdasarkan ID. Mengembalikan `true` jika berhasil, `false` jika tidak.
  **Contoh Mutasi:**
  ```graphql
  mutation DeleteExistingRoom($roomId: Int!) {
    deleteRoom(id: $roomId)
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "roomId": 101
  }
  ```

---

## 3. Reservation Service

**Endpoint:** `http://<RESERVATION_SERVICE_HOST_IP>:8002/graphql`

### Queries

- **`reservation(id: Int!) -> ReservationType`**: Mengambil detail reservasi berdasarkan ID. Termasuk detail tamu dan kamar terkait.
  **Contoh Query:**
  ```graphql
  query GetReservation($reservationId: Int!) {
    reservation(id: $reservationId) {
      id
      guestId
      roomId
      checkInDate
      checkOutDate
      status
      guest { # Data dari GuestService
        id
        fullName
        email
      }
      room { # Data dari RoomService
        id
        roomNumber
        roomType
      }
    }
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "reservationId": 1
  }
  ```

- **`reservations -> [ReservationType]`**: Mengambil daftar semua reservasi.
  **Contoh Query:**
  ```graphql
  query GetAllReservations {
    reservations {
      id
      guestId
      roomId
      checkInDate
      checkOutDate
      status
    }
  }
  ```
  *(Query ini tidak memerlukan variabel.)*

- **`reservationsByGuest(guestId: Int!) -> [ReservationType]`**: Mengambil daftar reservasi untuk tamu tertentu.
  **Contoh Query:**
  ```graphql
  query GetReservationsByGuest($guestId: Int!) {
    reservationsByGuest(guestId: $guestId) {
      id
      roomId
      checkInDate
      checkOutDate
      status
    }
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "guestId": 1
  }
  ```

- **`reservationsByRoom(roomId: Int!) -> [ReservationType]`**: Mengambil daftar reservasi untuk kamar tertentu.
  **Contoh Query:**
  ```graphql
  query GetReservationsByRoom($roomId: Int!) {
    reservationsByRoom(roomId: $roomId) {
      id
      guestId
      checkInDate
      checkOutDate
      status
    }
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "roomId": 101
  }
  ```

### Mutations

- **`createReservation(reservationData: ReservationInput!) -> ReservationType`**: Membuat reservasi baru. Akan mengupdate status kamar menjadi 'reserved'.
  **Contoh Mutasi:**
  ```graphql
  mutation CreateNewReservation($reservationData: ReservationInput!) {
    createReservation(reservationData: $reservationData) {
      id
      guestId
      roomId
      checkInDate
      checkOutDate
      status
      guest { id fullName }
      room { id roomNumber status }
    }
  }
  ```
  **Definisi Input `ReservationInput`:**
  ```graphql
  input ReservationInput {
    guestId: Int!
    roomId: Int!
    checkInDate: Date!      # Format: "YYYY-MM-DD"
    checkOutDate: Date!     # Format: "YYYY-MM-DD"
    status: String          # Opsional, contoh: "confirmed", "pending"
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "reservationData": {
      "guestId": 1,
      "roomId": 101,
      "checkInDate": "2024-08-01",
      "checkOutDate": "2024-08-05",
      "status": "confirmed"
    }
  }
  ```

- **`updateReservation(id: Int!, reservationData: ReservationUpdateInput!) -> ReservationType`**: Memperbarui informasi reservasi. Dapat mengubah status kamar jika `roomId` atau `status` reservasi diubah (misal, menjadi 'checked-out' akan membuat kamar 'available').
  **Contoh Mutasi:**
  ```graphql
  mutation UpdateExistingReservation($reservationId: Int!, $reservationData: ReservationUpdateInput!) {
    updateReservation(id: $reservationId, reservationData: $reservationData) {
      id
      guestId
      roomId
      checkInDate
      checkOutDate
      status
    }
  }
  ```
  **Definisi Input `ReservationUpdateInput`:**
  ```graphql
  input ReservationUpdateInput {
    guestId: Int
    roomId: Int
    checkInDate: Date      # Format: "YYYY-MM-DD"
    checkOutDate: Date     # Format: "YYYY-MM-DD"
    status: String
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "reservationId": 1,
    "reservationData": {
      "checkOutDate": "2024-08-06",
      "status": "checked-in"
    }
  }
  ```

- **`deleteReservation(id: Int!) -> Boolean`**: Menghapus reservasi berdasarkan ID. Akan mengupdate status kamar terkait menjadi 'available'. Mengembalikan `true` jika berhasil, `false` jika tidak.
  **Contoh Mutasi:**
  ```graphql
  mutation DeleteExistingReservation($reservationId: Int!) {
    deleteReservation(id: $reservationId)
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "reservationId": 1
  }
  ```

---

## 4. Billing Service

**Endpoint:** `http://<BILLING_SERVICE_HOST_IP>:8004/graphql`

### Queries

- **`bill(id: Int!) -> BillType`**: Mengambil detail tagihan berdasarkan ID. Termasuk detail reservasi terkait.
  **Contoh Query:**
  ```graphql
  query GetBill($billId: Int!) {
    bill(id: $billId) {
      id
      reservationId
      totalAmount
      paymentStatus
      generatedAt
      reservation {
        id
        checkInDate
        checkOutDate
        guest { id fullName }
        room { id roomNumber pricePerNight }
      }
    }
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "billId": 1
  }
  ```

- **`bills -> [BillType]`**: Mengambil daftar semua tagihan.
  **Contoh Query:**
  ```graphql
  query GetAllBills {
    bills {
      id
      reservationId
      totalAmount
      paymentStatus
      generatedAt
    }
  }
  ```
  *(Query ini tidak memerlukan variabel.)*

- **`billsByReservation(reservationId: Int!) -> [BillType]`**: Mengambil daftar tagihan untuk reservasi tertentu.
  **Contoh Query:**
  ```graphql
  query GetBillsByReservation($reservationId: Int!) {
    billsByReservation(reservationId: $reservationId) {
      id
      totalAmount
      paymentStatus
      generatedAt
    }
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "reservationId": 1
  }
  ```

- **`billsByStatus(status: String!) -> [BillType]`**: Mengambil daftar tagihan berdasarkan status pembayaran (misal, 'pending', 'paid').
  **Contoh Query:**
  ```graphql
  query GetBillsByStatus($status: String!) {
    billsByStatus(status: $status) {
      id
      reservationId
      totalAmount
      generatedAt
    }
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "status": "pending"
  }
  ```

### Mutations

- **`createBill(billData: BillInput, reservationId: Int) -> BillType`**: Membuat tagihan baru. Dapat dibuat dengan menyediakan `BillInput` lengkap, atau hanya `reservationId` (maka `totalAmount` akan dihitung otomatis berdasarkan detail reservasi).

  **Opsi 1: Dengan `BillInput` Lengkap**
  **Contoh Mutasi:**
  ```graphql
  mutation CreateNewBillWithData($billData: BillInput!) {
    createBill(billData: $billData) {
      id
      reservationId
      totalAmount
      paymentStatus
      generatedAt
    }
  }
  ```
  **Definisi Input `BillInput`:**
  ```graphql
  input BillInput {
    reservationId: Int!
    totalAmount: Float!
    paymentStatus: String # Opsional, contoh: "pending", "paid"
  }
  ```
  **Contoh Variabel (untuk Playground - Opsi 1):**
  ```json
  {
    "billData": {
      "reservationId": 1,
      "totalAmount": 5000000.0,
      "paymentStatus": "pending"
    }
  }
  ```

  **Opsi 2: Hanya dengan `reservationId` (otomatis hitung `totalAmount`)**
  **Contoh Mutasi:**
  ```graphql
  mutation CreateNewBillForReservation($resId: Int!) {
    createBill(reservationId: $resId) {
      id
      reservationId
      totalAmount # Akan dihitung otomatis
      paymentStatus # Default 'pending'
      generatedAt
    }
  }
  ```
  **Contoh Variabel (untuk Playground - Opsi 2):**
  ```json
  {
    "resId": 1
  }
  ```

- **`updateBill(id: Int!, billData: BillUpdateInput!) -> BillType`**: Memperbarui informasi tagihan.
  **Contoh Mutasi:**
  ```graphql
  mutation UpdateExistingBill($billId: Int!, $billData: BillUpdateInput!) {
    updateBill(id: $billId, billData: $billData) {
      id
      reservationId
      totalAmount
      paymentStatus
      generatedAt
    }
  }
  ```
  **Definisi Input `BillUpdateInput`:**
  ```graphql
  input BillUpdateInput {
    totalAmount: Float
    paymentStatus: String # Contoh: "pending", "paid", "cancelled"
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "billId": 1,
    "billData": {
      "paymentStatus": "paid"
    }
  }
  ```

- **`deleteBill(id: Int!) -> Boolean`**: Menghapus tagihan berdasarkan ID. Mengembalikan `true` jika berhasil, `false` jika tidak.
  **Contoh Mutasi:**
  ```graphql
  mutation DeleteExistingBill($billId: Int!) {
    deleteBill(id: $billId)
  }
  ```
  **Contoh Variabel (untuk Playground):**
  ```json
  {
    "billId": 1
  }
  ```

---

Silakan hubungi tim HotelEase jika ada pertanyaan lebih lanjut atau untuk koordinasi detail teknis API.
