use std::fmt::Write;

const TOKEN_BYTES: usize = 32;

/// Genera un token aleatorio por ejecución para que solo esta app pueda usar el motor local.
pub fn generate_access_token() -> Result<String, getrandom::Error> {
    let mut bytes = [0u8; TOKEN_BYTES];
    getrandom::fill(&mut bytes)?;
    Ok(to_hex(&bytes))
}

fn to_hex(bytes: &[u8]) -> String {
    let mut hex = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        // Escribir en un String no puede fallar.
        let _ = write!(hex, "{byte:02x}");
    }
    hex
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn token_is_hex_encoded_with_two_characters_per_byte() {
        let token = generate_access_token().unwrap();

        assert_eq!(token.len(), TOKEN_BYTES * 2);
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn each_execution_gets_a_different_token() {
        let first = generate_access_token().unwrap();
        let second = generate_access_token().unwrap();

        assert_ne!(first, second);
    }

    #[test]
    fn hex_encoding_pads_small_values() {
        assert_eq!(to_hex(&[0x00, 0x0f, 0xff]), "000fff");
    }
}
