use windows::Win32::Foundation::HWND;
use windows::Win32::Graphics::Dwm::{
  DwmSetWindowAttribute, DWMWA_CAPTION_COLOR, DWMWA_TEXT_COLOR,
};

/// Verde FastWS del logotipo (#14d659). COLORREF es `0x00BBGGRR`.
const VERDE: u32 = 0x0059d614;

/// Carbón del texto que se apoya sobre el verde (#0a0d11). Es el mismo par que
/// usa `button-primary` del sistema: carbón sobre FastWS.
const CARBON: u32 = 0x00110d0a;

/// Tiñe el caption nativo de Windows del verde FastWS.
///
/// Es la vía elegida frente a una barra propia: mantiene los botones del sistema
/// y solo cambia el color, que es lo que pide el brief ("con los estilos del
/// sistema"). Requiere Windows 10 20H2 (build 18985) o superior; en versiones
/// anteriores `DwmSetWindowAttribute` devuelve un error que se ignora a
/// propósito: la app sigue funcionando con el caption del sistema.
pub fn pintar(hwnd: HWND) {
  unsafe {
    let caption = DwmSetWindowAttribute(
      hwnd,
      DWMWA_CAPTION_COLOR,
      &VERDE as *const u32 as *const core::ffi::c_void,
      size_of::<u32>() as u32,
    );
    let texto = DwmSetWindowAttribute(
      hwnd,
      DWMWA_TEXT_COLOR,
      &CARBON as *const u32 as *const core::ffi::c_void,
      size_of::<u32>() as u32,
    );
    // Sin este log el teñido fallaria en silencio: si la ventana no existe o
    // el atributo no se admite, la app sigue bien y solo se pierde el color.
    match (caption, texto) {
      (Ok(()), Ok(())) => log::info!("barra de título teñida de verde FastWS"),
      (Err(a), Err(b)) => log::warn!(
        "Windows no admite teñir el caption (build < 18985): caption={a} texto={b}"
      ),
      (a, b) => log::warn!("caption teñido a medias: caption={a:?} texto={b:?}"),
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn el_verde_de_marca_se_codifica_como_colorref() {
    // #14d659 -> 0x00BBGGRR = 0x0059d614
    assert_eq!(VERDE, 0x0059d614);
  }

  #[test]
  fn el_carbon_del_texto_sobre_verde() {
    // #0a0d11 -> 0x00BBGGRR = 0x00110d0a
    assert_eq!(CARBON, 0x00110d0a);
  }

  #[test]
  fn el_verde_y_el_carbon_son_distintos() {
    // Si fueran iguales, el texto sobre la barra sería invisible.
    assert_ne!(VERDE, CARBON);
  }
}
