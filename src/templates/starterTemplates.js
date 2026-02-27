const supportedLanguages = ['en', 'es', 'fr'];

const metaTemplates = {
  product: {
    key: 'product',
    label: 'Product',
    title: {
      en: '{{product_name}} | Buy {{brand_name}} Online',
      es: '{{product_name}} | Compra {{brand_name}} en línea',
      fr: '{{product_name}} | Achetez {{brand_name}} en ligne'
    },
    description: {
      en: 'Shop {{product_name}} at {{site_name}}. Features: {{top_features}}. Price from {{price}}.',
      es: 'Compra {{product_name}} en {{site_name}}. Características: {{top_features}}. Precio desde {{price}}.',
      fr: 'Achetez {{product_name}} sur {{site_name}}. Caractéristiques : {{top_features}}. Prix à partir de {{price}}.'
    },
    h1: {
      en: '{{product_name}}',
      es: '{{product_name}}',
      fr: '{{product_name}}'
    }
  },
  service: {
    key: 'service',
    label: 'Service',
    title: {
      en: '{{service_name}} Services in {{city}} | {{brand_name}}',
      es: 'Servicios de {{service_name}} en {{city}} | {{brand_name}}',
      fr: 'Services de {{service_name}} à {{city}} | {{brand_name}}'
    },
    description: {
      en: 'Discover {{service_name}} services by {{brand_name}} in {{city}}. Get pricing, process, and timelines.',
      es: 'Descubre servicios de {{service_name}} de {{brand_name}} en {{city}}. Obtén precios, procesos y tiempos.',
      fr: 'Découvrez les services de {{service_name}} de {{brand_name}} à {{city}}. Tarifs, processus et délais.'
    },
    h1: {
      en: '{{service_name}} Services',
      es: 'Servicios de {{service_name}}',
      fr: 'Services de {{service_name}}'
    }
  },
  article: {
    key: 'article',
    label: 'Article',
    title: {
      en: '{{article_title}} | {{site_name}}',
      es: '{{article_title}} | {{site_name}}',
      fr: '{{article_title}} | {{site_name}}'
    },
    description: {
      en: 'Read {{article_title}} on {{site_name}}. Learn about {{article_topic}} with actionable insights.',
      es: 'Lee {{article_title}} en {{site_name}}. Aprende sobre {{article_topic}} con ideas prácticas.',
      fr: 'Lisez {{article_title}} sur {{site_name}}. Découvrez {{article_topic}} avec des conseils pratiques.'
    },
    h1: {
      en: '{{article_title}}',
      es: '{{article_title}}',
      fr: '{{article_title}}'
    }
  },
  category: {
    key: 'category',
    label: 'Category',
    title: {
      en: '{{category_name}} | {{site_name}}',
      es: '{{category_name}} | {{site_name}}',
      fr: '{{category_name}} | {{site_name}}'
    },
    description: {
      en: 'Explore {{category_name}} at {{site_name}}. Compare top picks, pricing, and reviews.',
      es: 'Explora {{category_name}} en {{site_name}}. Compara opciones destacadas, precios y reseñas.',
      fr: 'Explorez {{category_name}} sur {{site_name}}. Comparez les meilleurs choix, prix et avis.'
    },
    h1: {
      en: '{{category_name}}',
      es: '{{category_name}}',
      fr: '{{category_name}}'
    }
  }
};

const schemaTemplates = {
  product: {
    key: 'product',
    label: 'Product',
    schemaType: 'Product',
    variants: {
      offer: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: '{{product_name}}',
        image: ['{{product_image_url}}'],
        description: '{{product_description}}',
        sku: '{{product_sku}}',
        brand: {
          '@type': 'Brand',
          name: '{{brand_name}}'
        },
        offers: {
          '@type': 'Offer',
          url: '{{product_url}}',
          priceCurrency: '{{currency}}',
          price: '{{price}}',
          availability: 'https://schema.org/{{availability}}'
        }
      },
      aggregateOffer: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: '{{product_name}}',
        image: ['{{product_image_url}}'],
        description: '{{product_description}}',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: '{{currency}}',
          lowPrice: '{{low_price}}',
          highPrice: '{{high_price}}',
          offerCount: '{{offer_count}}',
          availability: 'https://schema.org/{{availability}}'
        }
      }
    }
  },
  service: {
    key: 'service',
    label: 'Service',
    schemaType: 'Service',
    template: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: '{{service_name}}',
      provider: {
        '@type': 'Organization',
        name: '{{brand_name}}'
      },
      areaServed: '{{service_area}}',
      url: '{{service_url}}',
      description: '{{service_description}}'
    }
  },
  article: {
    key: 'article',
    label: 'Article',
    schemaType: 'BlogPosting',
    template: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: '{{article_title}}',
      description: '{{article_description}}',
      datePublished: '{{published_at_iso}}',
      dateModified: '{{updated_at_iso}}',
      author: {
        '@type': 'Person',
        name: '{{author_name}}'
      },
      publisher: {
        '@type': 'Organization',
        name: '{{site_name}}',
        logo: {
          '@type': 'ImageObject',
          url: '{{publisher_logo_url}}'
        }
      },
      mainEntityOfPage: '{{article_url}}'
    }
  },
  faqPage: {
    key: 'faqPage',
    label: 'FAQPage',
    schemaType: 'FAQPage',
    template: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '{{faq_question_1}}',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '{{faq_answer_1}}'
          }
        }
      ]
    }
  },
  organizationLocalBusiness: {
    key: 'organizationLocalBusiness',
    label: 'Organization/LocalBusiness',
    schemaType: 'Organization',
    source: 'projectSettings',
    variants: {
      organization: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: '{{project.organizationName}}',
        url: '{{project.websiteUrl}}',
        logo: '{{project.logoUrl}}',
        sameAs: '{{project.socialProfiles}}'
      },
      localBusiness: {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: '{{project.organizationName}}',
        url: '{{project.websiteUrl}}',
        image: '{{project.logoUrl}}',
        telephone: '{{project.phone}}',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '{{project.address.street}}',
          addressLocality: '{{project.address.city}}',
          addressRegion: '{{project.address.region}}',
          postalCode: '{{project.address.zip}}',
          addressCountry: '{{project.address.country}}'
        }
      }
    }
  }
};

export function getStarterTemplates() {
  return {
    version: 1,
    supportedLanguages,
    meta: metaTemplates,
    schema: schemaTemplates
  };
}
