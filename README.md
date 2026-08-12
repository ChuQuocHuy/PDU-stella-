# Stellar Mini Wallet

Mini DApp theo mô hình **ledger nội bộ** trên Soroban. Mỗi địa chỉ Stellar có
một số dư kiểu `i128` trong Persistent Storage và có thể:

- xem số dư bằng `get_balance`;
- ghi tăng số dư bằng `deposit`;
- ghi giảm số dư bằng `withdraw`;
- chuyển số dư nội bộ bằng `transfer`.

> Đây là project học tập trên Stellar Testnet. “Đơn vị” trong ví là số liệu
> ledger của contract, **không phải XLM hay token có giá trị**. `deposit` không
> nạp tài sản thật và `withdraw` không rút XLM.

## Những phần đã có

- Smart contract Rust/Soroban SDK 26, build ra WASM tối ưu.
- `require_auth()` cho mọi thao tác ghi.
- 4 lỗi có kiểu: `InvalidAmount`, `InsufficientBalance`, `SameAddress`,
  `Overflow`.
- Typed event cho `deposit`, `withdraw`, `transfer`.
- Persistent Storage và cơ chế bump TTL 30 ngày khi đọc/ghi entry đang hoạt động.
- 10 unit test cho happy path, lỗi, auth, rollback, overflow, event và TTL.
- TypeScript client được sinh trực tiếp từ ABI của WASM.
- Frontend tiếng Việt, responsive, có Freighter và hai chế độ:
  - **Demo cục bộ**: thử ngay, lưu dữ liệu trong trình duyệt, không gọi blockchain.
- **Stellar Testnet**: gọi contract đã deploy và ký bằng Freighter.

Contract Testnet hiện tại:

```text
CDVPU65FF3G7ZRSURELKUITCBQ2ZTES3NH5CO4W5V6N5U2NBURXJ6CXC
```

## Cấu trúc

```text
stellar-mini-wallet/
├── app/                         # Frontend React/vinext
├── contracts/mini_wallet/       # Smart contract Rust và unit test
├── packages/mini-wallet-client/ # TypeScript bindings sinh từ WASM
├── tests/                       # Kiểm tra server-rendered frontend
├── .env.example
├── Cargo.toml
└── package.json
```

## Yêu cầu môi trường

- Node.js 22.13 trở lên
- Rust và target `wasm32v1-none`
- Stellar CLI
- Freighter extension nếu muốn ký giao dịch Testnet

```powershell
rustup target add wasm32v1-none
stellar --version
```

## Chạy Demo ngay

```powershell
npm install
npm run dev
```

Mở địa chỉ hiện trong terminal. Chế độ **Demo cục bộ** được chọn sẵn. Bạn có thể
nạp, rút, chuyển cho `demo:bob`, xem lịch sử và dùng nút “Đặt lại Demo”.

## Kiểm thử và build

```powershell
# 10 unit test smart contract
npm run contract:test

# Lint frontend
npm run lint

# Toàn bộ contract test + production build + render test
npm test

# Một lệnh kiểm tra đầy đủ
npm run verify
```

Build riêng WASM và sinh lại TypeScript client:

```powershell
npm run contract:build
npm run bindings
npm run build:client
```

WASM nằm tại:

```text
target/wasm32v1-none/release/mini_wallet.wasm
```

## Dùng contract Testnet đã deploy

Frontend đã có sẵn Contract ID Testnet ở trên nên bạn chỉ cần chọn tab **Stellar
Testnet**, kết nối Freighter và đảm bảo Freighter đang ở mạng Testnet. Biến môi
trường chỉ cần thiết khi bạn muốn trỏ frontend sang một lần deploy khác.

## Tự deploy một bản Testnet mới

Tạo/fund một identity Testnet bằng Stellar CLI hoặc dùng identity Testnet bạn đã
có. Không commit secret key vào Git.

```powershell
stellar keys generate mini-wallet-deployer --network testnet --fund

stellar contract deploy `
  --wasm target/wasm32v1-none/release/mini_wallet.wasm `
  --source mini-wallet-deployer `
  --network testnet
```

Lệnh deploy trả về một Contract ID bắt đầu bằng `C`. Sao chép file cấu hình:

```powershell
Copy-Item .env.example .env.local
```

Điền Contract ID:

```dotenv
NEXT_PUBLIC_MINI_WALLET_CONTRACT_ID=C...
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

Sau đó chạy lại `npm run dev`, mở tab **Stellar Testnet**, kết nối Freighter và
đảm bảo Freighter đang ở mạng Testnet.

## Luồng giao dịch Testnet

1. Frontend tạo lời gọi bằng client sinh từ ABI.
2. Stellar RPC mô phỏng giao dịch và trả footprint/fee.
3. Freighter hiển thị yêu cầu ký; DApp không đọc secret key.
4. SDK gửi giao dịch đã ký và chờ ledger xác nhận.
5. Frontend cập nhật số dư trả về và liên kết transaction hash đến Stellar Expert.

## Quy tắc contract

- `amount` phải là số nguyên lớn hơn 0.
- Không được rút/chuyển vượt số dư.
- Không được chuyển cho chính mình.
- Mọi phép cộng đều dùng `checked_add` để chặn overflow.
- Giao dịch lỗi không thay đổi storage và không phát event thành công.
- Entry số dư bằng 0 được xóa khỏi Persistent Storage.

## Lưu ý bảo mật

- Chỉ dùng Testnet khi học và demo.
- Không nhập hoặc gửi secret key cho website.
- Chỉ chấp nhận cửa sổ ký do Freighter hiển thị.
- Kiểm tra mạng Freighter là Testnet trước khi xác nhận.
- Contract MVP là ledger minh họa, chưa phải ví lưu ký token. Bước nâng cấp tiếp
  theo là dùng Stellar Asset Contract để `deposit`/`withdraw` chuyển token thật.
