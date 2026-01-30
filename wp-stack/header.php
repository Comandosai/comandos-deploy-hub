<?php
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
  <header class="site-header">
    <div class="site-inner header-main-wrapper">
      <div class="header-branding">
        <a class="header-logo-link" href="<?php echo esc_url(home_url('/')); ?>">
          <?php 
          $logo_id = get_theme_mod('custom_logo') ?: get_option('site_logo');
          if ($logo_id) {
              $logo_attr = [
                  'class' => 'header-custom-logo',
                  'loading' => 'eager',
                  'fetchpriority' => 'high',
                  'width' => '64',
                  'height' => '64'
              ];
              echo wp_get_attachment_image($logo_id, [128, 128], false, $logo_attr);
          } else {
              $site_icon = get_site_icon_url(128);
              if ($site_icon) {
                  $site_icon_webp = str_ireplace('.png', '.webp', $site_icon);
                  echo '<img src="' . esc_url($site_icon_webp) . '" class="header-custom-logo" alt="logo" width="64" height="64" fetchpriority="high" loading="eager">';
              }
          }
          ?>
          <span class="header-site-title"><?php bloginfo('name'); ?></span>
        </a>
      </div>

      <nav class="header-navigation" role="navigation">
        <?php
        wp_nav_menu([
            'theme_location' => 'primary',
            'menu_class'     => 'header-menu',
            'container'      => false,
            'fallback_cb'    => '__return_false', // Hide menu if not assigned instead of showing all pages
        ]);
        ?>
      </nav>

      <div class="header-search-wrapper">
        <form role="search" method="get" class="header-search-form" action="<?php echo esc_url(home_url('/')); ?>">
          <div class="search-input-group">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="search" class="search-field" placeholder="Поиск по статьям..." value="<?php echo get_search_query(); ?>" name="s" />
          </div>
        </form>
      </div>
    </div>
  </header>

  <main class="site-main">
    <div class="site-inner">
