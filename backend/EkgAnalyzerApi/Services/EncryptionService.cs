using System.Security.Cryptography;
using System.Text;

namespace EkgAnalyzerApi.Services
{
    /// <summary>
    /// AES-256-CBC shifrlash/deshifrlash xizmati.
    /// O'z DSt 2814:2014 3-daraja talabiga muvofiq shaxsiy ma'lumotlar
    /// (passport, tug'ilgan sana) bazada shifrlangan saqlanadi.
    /// </summary>
    public class EncryptionService
    {
        private readonly byte[] _key;
        private const int KeySize = 256; // AES-256
        private const int BlockSize = 128;

        public EncryptionService(IConfiguration configuration)
        {
            var keyString = configuration["Encryption:AesKey"];
            if (string.IsNullOrEmpty(keyString))
            {
                throw new InvalidOperationException(
                    "Encryption:AesKey topilmadi! appsettings.Development.json yoki environment variable'ga qo'shing.");
            }

            // 32 bayt (256-bit) kalit
            _key = Convert.FromBase64String(keyString);

            if (_key.Length != 32)
            {
                throw new InvalidOperationException(
                    "AES kaliti 32 bayt (256 bit) bo'lishi kerak. Base64 formatda ~44 belgi.");
            }
        }

        /// <summary>
        /// Matnni AES-256-CBC bilan shifrlaydi.
        /// Qaytaruvchi format: Base64(IV + CipherText)
        /// </summary>
        public string Encrypt(string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
                return plainText;

            using var aes = Aes.Create();
            aes.KeySize = KeySize;
            aes.BlockSize = BlockSize;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;
            aes.Key = _key;
            aes.GenerateIV(); // Har safar yangi IV

            using var encryptor = aes.CreateEncryptor();
            var plainBytes = Encoding.UTF8.GetBytes(plainText);
            var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

            // IV + CipherText ni birlashtirib Base64 qilish
            var result = new byte[aes.IV.Length + cipherBytes.Length];
            Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
            Buffer.BlockCopy(cipherBytes, 0, result, aes.IV.Length, cipherBytes.Length);

            return Convert.ToBase64String(result);
        }

        /// <summary>
        /// AES-256-CBC bilan shifrlangan matnni deshifrlaydi.
        /// Kiruvchi format: Base64(IV + CipherText)
        /// </summary>
        public string Decrypt(string cipherText)
        {
            if (string.IsNullOrEmpty(cipherText))
                return cipherText;

            try
            {
                var fullCipher = Convert.FromBase64String(cipherText);

                using var aes = Aes.Create();
                aes.KeySize = KeySize;
                aes.BlockSize = BlockSize;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                aes.Key = _key;

                // Birinchi 16 bayt — IV
                var iv = new byte[16];
                var cipher = new byte[fullCipher.Length - 16];

                Buffer.BlockCopy(fullCipher, 0, iv, 0, 16);
                Buffer.BlockCopy(fullCipher, 16, cipher, 0, cipher.Length);

                aes.IV = iv;

                using var decryptor = aes.CreateDecryptor();
                var plainBytes = decryptor.TransformFinalBlock(cipher, 0, cipher.Length);
                return Encoding.UTF8.GetString(plainBytes);
            }
            catch
            {
                // Agar deshifrlash mumkin bo'lmasa (eski shiflanmagan ma'lumot)
                // — original qiymatni qaytarish
                return cipherText;
            }
        }

        /// <summary>
        /// Yangi AES-256 kalitini generatsiya qiladi (setup uchun).
        /// Bu metoddan faqat bir marta foydalaniladi — kalitni yaratish uchun.
        /// </summary>
        public static string GenerateKey()
        {
            var key = new byte[32]; // 256 bit
            RandomNumberGenerator.Fill(key);
            return Convert.ToBase64String(key);
        }
    }
}
