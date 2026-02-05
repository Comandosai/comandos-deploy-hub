<?php
/**
 * The Header for our theme.
 *
 * @package Comandos_Blog
 */
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Предзагрузка критических шрифтов для устранения прыжков -->
  <link rel="preload" href="<?php echo get_template_directory_uri(); ?>/assets/fonts/inter-400-subset.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="<?php echo get_template_directory_uri(); ?>/assets/fonts/unbounded-900.woff2" as="font" type="font/woff2" crossorigin>
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
  <header class="site-header">
    <div class="site-inner header-main-wrapper">
      
      <?php get_template_part('template-parts/header/branding'); ?>
      
      <?php get_template_part('template-parts/header/navigation'); ?>
      
      <?php get_template_part('template-parts/header/search'); ?>

    </div>
  </header>

  <main class="site-main">
    <div class="site-inner">
