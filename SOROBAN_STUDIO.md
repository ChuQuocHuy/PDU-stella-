# Dùng nhanh với Soroban Studio

1. Giải nén file `stellar-mini-wallet-soroban-ready.zip`.
2. File cần chọn trong Soroban Studio là `mini_wallet.wasm` nằm ngay ở thư mục
   gốc của project sau khi giải nén. Soroban Studio không cần `node_modules`.
3. Chọn mạng **Testnet**.
4. Có thể dùng contract đã deploy sẵn:

   ```text
   CDVPU65FF3G7ZRSURELKUITCBQ2ZTES3NH5CO4W5V6N5U2NBURXJ6CXC
   ```

5. Các hàm có sẵn: `ping`, `get_balance`, `deposit`, `withdraw`, `transfer`.

Lưu ý: `deposit`, `withdraw` và `transfer` cần chữ ký của đúng địa chỉ được yêu
cầu bởi `require_auth()`. Đây là ledger đơn vị nội bộ, không phải XLM thật.
