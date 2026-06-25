import { prisma }        from "@/lib/db/prisma";
import { SiteHeaderWrapper as SiteHeader } from "@/components/website/site-header-wrapper";
import { HeroCarousel }  from "@/components/website/hero-carousel";
import { MarqueeStrip }  from "@/components/website/marquee-strip";
import { AboutSection }        from "@/components/website/about-section";
import { TestimonialsSection } from "@/components/website/testimonials-section";
import { ReviewsSection }      from "@/components/website/reviews-section";
import { ScienceSection }      from "@/components/website/science-section";
import { BlogSection }         from "@/components/website/blog-section";
import { SocialSection }       from "@/components/website/social-section";
import { WhyChooseSection }    from "@/components/website/why-choose-section";
import { PartnersSection }      from "@/components/website/partners-section";
import { FeaturedImageSection } from "@/components/website/featured-image-section";
import { InsiderSection }       from "@/components/website/insider-section";
import { FaqSection }          from "@/components/website/faq-section";
import { SiteFooter }         from "@/components/website/site-footer";

export default async function HomePage() {
  const [banners, blogPosts] = await Promise.all([
    prisma.websiteBanner.findMany({
      where:   { isPublished: true },
      orderBy: { sortOrder: "asc" },
      select:  { id: true, imageUrl: true },
    }),
    prisma.blog.findMany({
      where:   { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take:    3,
      select:  { id: true, title: true, slug: true, excerpt: true, imageUrl: true },
    }),
  ]);

  return (
    <>
    <main>
      <div className="relative">
        <SiteHeader />
        <HeroCarousel banners={banners} />
      </div>
      <MarqueeStrip />
      <AboutSection />
      <TestimonialsSection />
      <ScienceSection />
      <BlogSection posts={blogPosts} />
      <SocialSection />
      <WhyChooseSection />
      <PartnersSection />
      <InsiderSection />
      <ReviewsSection />
      <FeaturedImageSection />
      <FaqSection />
    </main>
    <SiteFooter />
    </>
  );
}
