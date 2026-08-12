# Stellar Mini Wallet DApp

Mini Wallet là một dự án học tập xây dựng trên **Stellar Soroban**. Dự án gồm
smart contract Rust và giao diện web cho phép người dùng xem, nạp, rút và chuyển
số dư ledger nội bộ bằng ví Freighter trên Stellar Testnet.

> Lưu ý: số dư trong dự án là **đơn vị ledger nội bộ**, không phải XLM hoặc token
> có giá trị. Chỉ sử dụng Testnet để học tập và kiểm thử.

## Liên kết nhanh

- Repository: <https://github.com/ChuQuocHuy/PDU-stella->
- Contract trên Stellar Lab: <https://lab.stellar.org/r/testnet/contract/CDVPU65FF3G7ZRSURELKUITCBQ2ZTES3NH5CO4W5V6N5U2NBURXJ6CXC>
- Bản web đã triển khai: <https://stellar-mini-wallet-vn.model-potions-0vna2x.chatgpt.site/>
- Hướng dẫn riêng cho Soroban Studio: [SOROBAN_STUDIO.md](./SOROBAN_STUDIO.md)

Contract ID trên Testnet:

```text
CDVPU65FF3G7ZRSURELKUITCBQ2ZTES3NH5CO4W5V6N5U2NBURXJ6CXC
```

## Chức năng

- `ping()` — kiểm tra contract đang hoạt động.
- `get_balance(user)` — xem số dư nội bộ của một địa chỉ.
- `deposit(user, amount)` — tăng số dư của người ký.
- `withdraw(user, amount)` — giảm số dư của người ký.
- `transfer(from, to, amount)` — chuyển số dư giữa hai địa chỉ.
- Xác thực mọi thao tác ghi bằng `require_auth()`.
- Phát typed event cho `deposit`, `withdraw` và `transfer`.
- Persistent Storage với cơ chế gia hạn TTL.
- Bốn lỗi contract rõ ràng: `InvalidAmount`, `InsufficientBalance`,
  `SameAddress`, `Overflow`.
- Chế độ Demo cục bộ để thử giao diện mà không cần blockchain.
- Chế độ Stellar Testnet kết nối và ký bằng Freighter.

## Cấu trúc dự án

```text
PDU-stella-/
├── app/                          # Giao diện React/vinext
├── contracts/mini_wallet/        # Smart contract Rust và unit tests
├── packages/mini-wallet-client/  # TypeScript bindings sinh từ contract
├── public/                       # Tài nguyên giao diện
├── tests/                        # Frontend render tests
├── mini_wallet.wasm              # WASM đã build sẵn cho Soroban
├── Cargo.toml                    # Rust workspace
├── package.json                  # Lệnh chạy frontend và kiểm thử
└── SOROBAN_STUDIO.md             # Hướng dẫn Soroban Studio
```

## Cách chạy nhanh giao diện

### 1. Yêu cầu

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) phiên bản 22.13 trở lên
- Freighter extension nếu muốn sử dụng Testnet

### 2. Chạy trên Windows bằng CMD

#### Lần đầu tải và chạy dự án

Trong cửa sổ **CMD**, chạy đúng các lệnh sau:

```cmd
cd /d "%USERPROFILE%"
git clone https://github.com/ChuQuocHuy/PDU-stella-.git
cd PDU-stella-
dir package.json
npm install
npm run dev
```

Lệnh `dir package.json` dùng để kiểm tra CMD đang đứng đúng thư mục dự án. Nếu
thấy file `package.json` trong kết quả thì mới tiếp tục chạy `npm install` và
`npm run dev`.

#### Những lần chạy sau

Nếu đã tải dự án và cài thư viện, chỉ cần mở CMD rồi chạy:

```cmd
cd /d "%USERPROFILE%\PDU-stella-"
npm run dev
```

Nếu đã lưu dự án ở vị trí khác, hãy thay đường dẫn trên bằng đường dẫn thật tới
thư mục dự án, ví dụ:

```cmd
cd /d "D:\HocTap\PDU-stella-"
npm run dev
```

Giữ cửa sổ CMD mở trong lúc sử dụng website. Mở đúng URL mà terminal hiển thị,
thường là `http://localhost:3000` hoặc một cổng localhost khác. Nhấn `Ctrl+C`
trong CMD để dừng website.

#### Sửa lỗi `ENOENT: Could not read package.json`

Lỗi này có nghĩa là CMD đang đứng sai thư mục. Không chạy `npm install` hoặc
`npm run dev` tại `C:\Users\ten-cua-ban` nếu ở đó không có `package.json`.
Hãy chuyển vào thư mục dự án rồi kiểm tra lại:

```cmd
cd /d "C:\duong-dan-thuc-te\PDU-stella-"
dir package.json
npm install
npm run dev
```

### 3. Chạy trên macOS hoặc Linux

```bash
git clone https://github.com/ChuQuocHuy/PDU-stella-.git
cd PDU-stella-
npm install
npm run dev
```

### 4. Thử chế độ Demo

1. Chọn **Demo cục bộ**.
2. Thử nạp `100`, rút một phần hoặc chuyển cho `demo:bob`.
3. Demo lưu trạng thái trong trình duyệt và không tạo giao dịch blockchain.

### 5. Thử Stellar Testnet

1. Cài Freighter.
2. Trong Freighter, chọn mạng **Test SDF Network**.
3. Cấp một ít Testnet XLM bằng Friendbot nếu tài khoản chưa được fund.
4. Trên giao diện, chọn **Stellar Testnet**.
5. Bấm **Kết nối Freighter** và xác nhận quyền truy cập.
6. Nhập số lượng rồi nạp, rút hoặc chuyển.
7. Kiểm tra nội dung giao dịch và xác nhận chữ ký trong Freighter.

DApp không yêu cầu và không đọc secret key. Khóa luôn được quản lý bởi
Freighter.

## Chạy kiểm thử

Sau khi `npm install`, chạy toàn bộ lint, contract tests, frontend build và
render tests:

```bash
npm run verify
```

Hoặc chạy riêng từng phần:

```bash
npm run lint
npm run contract:test
npm test
```

Kết quả hiện tại:

- 10/10 smart-contract unit tests đạt.
- 2/2 frontend render tests đạt.
- Production build thành công.

## Build smart contract trên máy

### Yêu cầu bổ sung

- Rust toolchain
- Stellar CLI
- Rust target `wasm32v1-none`

```bash
rustup target add wasm32v1-none
stellar --version
```

Build và kiểm thử:

```bash
cargo test --locked
stellar contract build
```

WASM mới sẽ nằm tại:

```text
target/wasm32v1-none/release/mini_wallet.wasm
```

Sinh lại TypeScript bindings sau khi thay đổi contract:

```bash
npm run bindings
npm run build:client
```

## Tự deploy contract mới lên Testnet

Không cần deploy lại nếu chỉ muốn thử project: frontend đang sử dụng Contract
ID Testnet có sẵn ở đầu README.

Nếu bạn đã sửa mã Rust và muốn deploy một contract mới:

```bash
stellar keys generate mini-wallet-deployer --network testnet --fund
stellar contract build
stellar contract deploy \
  --wasm target/wasm32v1-none/release/mini_wallet.wasm \
  --source mini-wallet-deployer \
  --network testnet
```

Trên Windows PowerShell, lệnh deploy có thể viết như sau:

```powershell
stellar contract deploy `
  --wasm target\wasm32v1-none\release\mini_wallet.wasm `
  --source mini-wallet-deployer `
  --network testnet
```

Sao chép file cấu hình và thay Contract ID vừa nhận:

```powershell
Copy-Item .env.example .env.local
```

```dotenv
NEXT_PUBLIC_MINI_WALLET_CONTRACT_ID=C...
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

Khởi động lại frontend sau khi thay đổi biến môi trường.

## Mở project trong Soroban Studio

Soroban Studio là công cụ tùy chọn; GitHub và Stellar CLI vẫn hoạt động độc lập
nếu terminal của Studio gặp lỗi.

1. Mở <https://soroban.studio/>.
2. Chọn **Create Project → Clone from GitHub**.
3. Nhập `https://github.com/ChuQuocHuy/PDU-stella-.git`.
4. Mở mục **Deploy** ở thanh bên.
5. Chọn **Create & Fund Account** hoặc kết nối Freighter ở Testnet.
6. Bấm **Build Contract**, sau đó bấm **Deploy**.

Nếu Studio không nhận cấu trúc monorepo, hãy tạo **Hello World Project**, sau đó
chép nội dung của `contracts/mini_wallet/src/lib.rs` vào file `src/lib.rs` của
contract mẫu và build lại.

File `mini_wallet.wasm` trong repository là file nhị phân đã build. Khi mở nó
trong trình soạn thảo, màn hình trống là bình thường.

### Lỗi `Failed to fetch` trong Soroban Studio

Đây thường là lỗi kết nối terminal/backend của Soroban Studio, không phải lỗi
smart contract. Có thể thử:

1. Nhấn `Ctrl+Shift+R` để tải lại hoàn toàn.
2. Tắt VPN, proxy hoặc extension chặn request cho `soroban.studio`.
3. Thử Edge/Chrome ở cửa sổ ẩn danh hoặc một mạng Internet khác.
4. Nếu vẫn lỗi, build bằng Stellar CLI hoặc dùng contract đã deploy trong
   Stellar Lab.

## Quy tắc của contract

- `amount` phải là số nguyên lớn hơn `0`.
- Không thể rút hoặc chuyển vượt quá số dư.
- Không thể chuyển cho chính địa chỉ gửi.
- Phép cộng sử dụng `checked_add` để ngăn overflow.
- Giao dịch lỗi không thay đổi storage và không phát event thành công.
- Entry có số dư bằng `0` được xóa khỏi Persistent Storage.

## Bảo mật

- Chỉ sử dụng Testnet cho project này.
- Không nhập secret key vào website hoặc commit secret key lên GitHub.
- Luôn kiểm tra Freighter đang ở Testnet trước khi ký.
- Chỉ xác nhận giao dịch khi địa chỉ và số lượng hiển thị đúng.
- Đây là ledger minh họa, chưa phải ví lưu ký XLM/token thật.

## Công nghệ sử dụng

- Rust
- Soroban SDK 26
- Stellar CLI
- TypeScript
- React/vinext
- Freighter API
- Stellar Testnet
