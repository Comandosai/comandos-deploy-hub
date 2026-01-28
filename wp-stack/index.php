<?php
get_header();
?>
<section class="posts">
  <?php if (have_posts()) : ?>
    <?php while (have_posts()) : the_post(); ?>
      <article <?php post_class('post-card'); ?>>
        <a class="post-thumb<?php echo has_post_thumbnail() ? '' : ' placeholder'; ?>" href="<?php the_permalink(); ?>">
          <?php if (has_post_thumbnail()) : ?>
            <?php the_post_thumbnail('large'); ?>
          <?php endif; ?>
        </a>
        <div class="post-body">
          <div class="post-meta">
            <time datetime="<?php echo esc_attr(get_the_date(DATE_W3C)); ?>">
              <?php echo esc_html(get_the_date()); ?>
            </time>
          </div>
          <h2 class="post-title">
            <a href="<?php the_permalink(); ?>">
              <?php the_title(); ?>
            </a>
          </h2>
          <?php if (has_excerpt() || get_the_content()) : ?>
            <div class="post-excerpt">
              <?php the_excerpt(); ?>
            </div>
          <?php endif; ?>
        </div>
      </article>
    <?php endwhile; ?>

    <div class="pagination">
      <?php
      the_posts_pagination([
          'mid_size' => 1,
          'prev_text' => 'Назад',
          'next_text' => 'Вперёд',
      ]);
      ?>
    </div>
  <?php else : ?>
    <div class="empty-state">
      Записей пока нет. Добавьте первую запись через WordPress.
    </div>
  <?php endif; ?>
</section>
<?php
get_footer();
