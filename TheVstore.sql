PGDMP                         x         	   thevstore    12.2    12.2 [    �           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            �           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            �           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            �           1262    16393 	   thevstore    DATABASE     �   CREATE DATABASE thevstore WITH TEMPLATE = template0 ENCODING = 'UTF8' LC_COLLATE = 'English_India.1252' LC_CTYPE = 'English_India.1252';
    DROP DATABASE thevstore;
                postgres    false            �            1255    16802    insertproduct()    FUNCTION     #  CREATE FUNCTION public.insertproduct() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE 
t_row "user"%rowtype;
BEGIN
FOR t_row in SELECT "username" FROM "user" LOOP
        INSERT INTO "recommender" VALUES(t_row."username",new."product_id",'0');
        END LOOP;
RETURN new;
END;
$$;
 &   DROP FUNCTION public.insertproduct();
       public          postgres    false            �            1255    16804    insertuser()    FUNCTION     (  CREATE FUNCTION public.insertuser() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE 
t_row "product"%rowtype;
BEGIN
FOR t_row in SELECT "product_id" FROM "product" LOOP
        INSERT INTO "recommender" VALUES(new."username",t_row."product_id",'0');
        END LOOP;
RETURN new;
END;
$$;
 #   DROP FUNCTION public.insertuser();
       public          postgres    false            �            1259    16508    book    TABLE     �   CREATE TABLE public.book (
    product_id integer NOT NULL,
    publication character varying NOT NULL,
    edition character varying NOT NULL,
    subject character varying NOT NULL,
    author character varying
);
    DROP TABLE public.book;
       public         heap    postgres    false            �            1259    16470    product    TABLE       CREATE TABLE public.product (
    product_id integer NOT NULL,
    product_name character varying NOT NULL,
    years_of_usage integer NOT NULL,
    price integer NOT NULL,
    buyer_id character varying,
    product_image character varying,
    seller_id character varying NOT NULL,
    category character varying,
    condition character varying,
    document_with_idx tsvector
);
    DROP TABLE public.product;
       public         heap    postgres    false            �            1259    16460    user    TABLE     o  CREATE TABLE public."user" (
    username character varying NOT NULL,
    name character varying NOT NULL,
    email_id character varying NOT NULL,
    password character varying NOT NULL,
    contact bigint NOT NULL,
    location character varying,
    year character varying,
    image character varying DEFAULT '../images/studentprofile.svg'::character varying
);
    DROP TABLE public."user";
       public         heap    postgres    false            �            1259    16705    bookview    VIEW     <  CREATE VIEW public.bookview AS
 SELECT product.product_id,
    product.product_name,
    product.years_of_usage,
    product.price,
    product.product_image,
    product.condition,
    product.category,
    "user".username,
    "user".name,
    "user".email_id,
    "user".contact,
    "user".location,
    "user".year,
    book.author,
    book.publication,
    book.edition,
    book.subject
   FROM ((public.product
     JOIN public."user" ON (((product.seller_id)::text = ("user".username)::text)))
     JOIN public.book ON ((product.product_id = book.product_id)));
    DROP VIEW public.bookview;
       public          postgres    false    202    204    205    205    205    205    205    204    204    204    204    204    204    204    202    202    202    202    202            �            1259    16521 
   calculator    TABLE     �   CREATE TABLE public.calculator (
    product_id integer NOT NULL,
    brand character varying NOT NULL,
    model character varying NOT NULL,
    features character varying NOT NULL
);
    DROP TABLE public.calculator;
       public         heap    postgres    false            �            1259    16684    calcview    VIEW     B  CREATE VIEW public.calcview AS
 SELECT product.product_id,
    product.product_name,
    product.years_of_usage,
    product.price,
    product.product_image,
    product.condition,
    product.category,
    "user".username,
    "user".name,
    "user".email_id,
    "user".contact,
    "user".location,
    "user".year,
    calculator.brand,
    calculator.model,
    calculator.features
   FROM ((public.product
     JOIN public."user" ON (((product.seller_id)::text = ("user".username)::text)))
     JOIN public.calculator ON ((product.product_id = calculator.product_id)));
    DROP VIEW public.calcview;
       public          postgres    false    202    202    202    202    204    204    204    204    204    204    206    206    206    204    204    202    202    206            �            1259    16765    cart    TABLE     g   CREATE TABLE public.cart (
    username character varying NOT NULL,
    product_id integer NOT NULL
);
    DROP TABLE public.cart;
       public         heap    postgres    false            �            1259    16534    clothing    TABLE     �   CREATE TABLE public.clothing (
    product_id integer NOT NULL,
    size character varying NOT NULL,
    type character varying NOT NULL,
    color character varying NOT NULL
);
    DROP TABLE public.clothing;
       public         heap    postgres    false            �            1259    16669 	   clothview    VIEW     4  CREATE VIEW public.clothview AS
 SELECT product.product_id,
    product.product_name,
    product.years_of_usage,
    product.price,
    product.product_image,
    product.condition,
    product.category,
    "user".username,
    "user".name,
    "user".email_id,
    "user".contact,
    "user".location,
    "user".year,
    clothing.size,
    clothing.type,
    clothing.color
   FROM ((public.product
     JOIN public."user" ON (((product.seller_id)::text = ("user".username)::text)))
     JOIN public.clothing ON ((product.product_id = clothing.product_id)));
    DROP VIEW public.clothview;
       public          postgres    false    202    207    207    207    207    204    204    204    204    204    204    204    204    202    202    202    202    202            �            1259    16602    comments    TABLE     �   CREATE TABLE public.comments (
    comment_id bigint NOT NULL,
    username character varying,
    product_id integer,
    content character varying NOT NULL
);
    DROP TABLE public.comments;
       public         heap    postgres    false            �            1259    16600    comments_comment_id_seq    SEQUENCE     �   CREATE SEQUENCE public.comments_comment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public.comments_comment_id_seq;
       public          postgres    false    213            �           0    0    comments_comment_id_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public.comments_comment_id_seq OWNED BY public.comments.comment_id;
          public          postgres    false    212            �            1259    16549    notes    TABLE     �   CREATE TABLE public.notes (
    product_id integer NOT NULL,
    subject character varying NOT NULL,
    topic character varying NOT NULL,
    professor character varying NOT NULL,
    noteyear character varying NOT NULL
);
    DROP TABLE public.notes;
       public         heap    postgres    false            �            1259    16547    notes_product_id_seq    SEQUENCE     �   CREATE SEQUENCE public.notes_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public.notes_product_id_seq;
       public          postgres    false    209            �           0    0    notes_product_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public.notes_product_id_seq OWNED BY public.notes.product_id;
          public          postgres    false    208            �            1259    16664 	   notesview    VIEW     A  CREATE VIEW public.notesview AS
 SELECT product.product_id,
    product.product_name,
    product.years_of_usage,
    product.price,
    product.product_image,
    product.condition,
    product.category,
    "user".username,
    "user".name,
    "user".email_id,
    "user".contact,
    "user".location,
    "user".year,
    notes.topic,
    notes.professor,
    notes.noteyear,
    notes.subject
   FROM ((public.product
     JOIN public."user" ON (((product.seller_id)::text = ("user".username)::text)))
     JOIN public.notes ON ((product.product_id = notes.product_id)));
    DROP VIEW public.notesview;
       public          postgres    false    204    204    202    204    204    204    204    204    204    209    209    209    209    209    202    202    202    202    202            �            1259    16563    other    TABLE     ~   CREATE TABLE public.other (
    product_id integer NOT NULL,
    description character varying,
    type character varying
);
    DROP TABLE public.other;
       public         heap    postgres    false            �            1259    16674 	   otherview    VIEW       CREATE VIEW public.otherview AS
 SELECT product.product_id,
    product.product_name,
    product.years_of_usage,
    product.price,
    product.product_image,
    product.condition,
    product.category,
    "user".username,
    "user".name,
    "user".email_id,
    "user".contact,
    "user".location,
    "user".year,
    other.type,
    other.description
   FROM ((public.product
     JOIN public."user" ON (((product.seller_id)::text = ("user".username)::text)))
     JOIN public.other ON ((product.product_id = other.product_id)));
    DROP VIEW public.otherview;
       public          postgres    false    202    210    210    210    204    204    204    204    204    204    204    204    202    202    202    202    202            �            1259    16576    pc    TABLE     �   CREATE TABLE public.pc (
    product_id integer NOT NULL,
    os character varying,
    ram character varying,
    storage character varying,
    brand character varying,
    processor character varying
);
    DROP TABLE public.pc;
       public         heap    postgres    false            �            1259    16710    pcview    VIEW     2  CREATE VIEW public.pcview AS
 SELECT product.product_id,
    product.product_name,
    product.years_of_usage,
    product.price,
    product.product_image,
    product.condition,
    product.category,
    "user".username,
    "user".name,
    "user".email_id,
    "user".contact,
    "user".location,
    "user".year,
    pc.os,
    pc.ram,
    pc.storage,
    pc.brand,
    pc.processor
   FROM ((public.product
     JOIN public."user" ON (((product.seller_id)::text = ("user".username)::text)))
     JOIN public.pc ON ((product.product_id = pc.product_id)));
    DROP VIEW public.pcview;
       public          postgres    false    211    211    211    211    211    211    204    204    204    204    204    204    204    204    202    202    202    202    202    202            �            1259    16468    product_product_id_seq    SEQUENCE     �   CREATE SEQUENCE public.product_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 -   DROP SEQUENCE public.product_product_id_seq;
       public          postgres    false    204            �           0    0    product_product_id_seq    SEQUENCE OWNED BY     Q   ALTER SEQUENCE public.product_product_id_seq OWNED BY public.product.product_id;
          public          postgres    false    203            �            1259    16783    recommender    TABLE     �   CREATE TABLE public.recommender (
    username character varying NOT NULL,
    product_id integer NOT NULL,
    priority integer DEFAULT 0
);
    DROP TABLE public.recommender;
       public         heap    postgres    false            �            1259    16721    requests    TABLE     �   CREATE TABLE public.requests (
    buyer_id character varying NOT NULL,
    seller_id character varying NOT NULL,
    product_id integer NOT NULL,
    otp integer NOT NULL
);
    DROP TABLE public.requests;
       public         heap    postgres    false            �            1259    16715    tempmail    TABLE     Y   CREATE TABLE public.tempmail (
    email character varying,
    otp character varying
);
    DROP TABLE public.tempmail;
       public         heap    postgres    false            �            1259    16746    transaction    TABLE       CREATE TABLE public.transaction (
    transaction_id integer NOT NULL,
    buyer_id character varying,
    seller_id character varying,
    product_name character varying NOT NULL,
    finalized_price integer NOT NULL,
    product_image character varying NOT NULL
);
    DROP TABLE public.transaction;
       public         heap    postgres    false            �            1259    16744    transaction_transaction_id_seq    SEQUENCE     �   CREATE SEQUENCE public.transaction_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 5   DROP SEQUENCE public.transaction_transaction_id_seq;
       public          postgres    false    223            �           0    0    transaction_transaction_id_seq    SEQUENCE OWNED BY     a   ALTER SEQUENCE public.transaction_transaction_id_seq OWNED BY public.transaction.transaction_id;
          public          postgres    false    222            �
           2604    16605    comments comment_id    DEFAULT     z   ALTER TABLE ONLY public.comments ALTER COLUMN comment_id SET DEFAULT nextval('public.comments_comment_id_seq'::regclass);
 B   ALTER TABLE public.comments ALTER COLUMN comment_id DROP DEFAULT;
       public          postgres    false    213    212    213            �
           2604    16552    notes product_id    DEFAULT     t   ALTER TABLE ONLY public.notes ALTER COLUMN product_id SET DEFAULT nextval('public.notes_product_id_seq'::regclass);
 ?   ALTER TABLE public.notes ALTER COLUMN product_id DROP DEFAULT;
       public          postgres    false    208    209    209            �
           2604    16473    product product_id    DEFAULT     x   ALTER TABLE ONLY public.product ALTER COLUMN product_id SET DEFAULT nextval('public.product_product_id_seq'::regclass);
 A   ALTER TABLE public.product ALTER COLUMN product_id DROP DEFAULT;
       public          postgres    false    203    204    204            �
           2604    16749    transaction transaction_id    DEFAULT     �   ALTER TABLE ONLY public.transaction ALTER COLUMN transaction_id SET DEFAULT nextval('public.transaction_transaction_id_seq'::regclass);
 I   ALTER TABLE public.transaction ALTER COLUMN transaction_id DROP DEFAULT;
       public          postgres    false    223    222    223            �          0    16508    book 
   TABLE DATA           Q   COPY public.book (product_id, publication, edition, subject, author) FROM stdin;
    public          postgres    false    205   7       �          0    16521 
   calculator 
   TABLE DATA           H   COPY public.calculator (product_id, brand, model, features) FROM stdin;
    public          postgres    false    206   {       �          0    16765    cart 
   TABLE DATA           4   COPY public.cart (username, product_id) FROM stdin;
    public          postgres    false    224   �       �          0    16534    clothing 
   TABLE DATA           A   COPY public.clothing (product_id, size, type, color) FROM stdin;
    public          postgres    false    207   �       �          0    16602    comments 
   TABLE DATA           M   COPY public.comments (comment_id, username, product_id, content) FROM stdin;
    public          postgres    false    213   �       �          0    16549    notes 
   TABLE DATA           P   COPY public.notes (product_id, subject, topic, professor, noteyear) FROM stdin;
    public          postgres    false    209   �       �          0    16563    other 
   TABLE DATA           >   COPY public.other (product_id, description, type) FROM stdin;
    public          postgres    false    210   /�       �          0    16576    pc 
   TABLE DATA           L   COPY public.pc (product_id, os, ram, storage, brand, processor) FROM stdin;
    public          postgres    false    211   L�       �          0    16470    product 
   TABLE DATA           �   COPY public.product (product_id, product_name, years_of_usage, price, buyer_id, product_image, seller_id, category, condition, document_with_idx) FROM stdin;
    public          postgres    false    204   i�       �          0    16783    recommender 
   TABLE DATA           E   COPY public.recommender (username, product_id, priority) FROM stdin;
    public          postgres    false    225   �       �          0    16721    requests 
   TABLE DATA           H   COPY public.requests (buyer_id, seller_id, product_id, otp) FROM stdin;
    public          postgres    false    221   ,�       �          0    16715    tempmail 
   TABLE DATA           .   COPY public.tempmail (email, otp) FROM stdin;
    public          postgres    false    220   I�       �          0    16746    transaction 
   TABLE DATA           x   COPY public.transaction (transaction_id, buyer_id, seller_id, product_name, finalized_price, product_image) FROM stdin;
    public          postgres    false    223   f�       �          0    16460    user 
   TABLE DATA           d   COPY public."user" (username, name, email_id, password, contact, location, year, image) FROM stdin;
    public          postgres    false    202   ��       �           0    0    comments_comment_id_seq    SEQUENCE SET     F   SELECT pg_catalog.setval('public.comments_comment_id_seq', 14, true);
          public          postgres    false    212            �           0    0    notes_product_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public.notes_product_id_seq', 1, false);
          public          postgres    false    208            �           0    0    product_product_id_seq    SEQUENCE SET     E   SELECT pg_catalog.setval('public.product_product_id_seq', 59, true);
          public          postgres    false    203            �           0    0    transaction_transaction_id_seq    SEQUENCE SET     L   SELECT pg_catalog.setval('public.transaction_transaction_id_seq', 6, true);
          public          postgres    false    222            �
           2606    16515    book book_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.book
    ADD CONSTRAINT book_pkey PRIMARY KEY (product_id);
 8   ALTER TABLE ONLY public.book DROP CONSTRAINT book_pkey;
       public            postgres    false    205            �
           2606    16528    calculator calculator_pkey 
   CONSTRAINT     `   ALTER TABLE ONLY public.calculator
    ADD CONSTRAINT calculator_pkey PRIMARY KEY (product_id);
 D   ALTER TABLE ONLY public.calculator DROP CONSTRAINT calculator_pkey;
       public            postgres    false    206            �
           2606    16772    cart cart_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_pkey PRIMARY KEY (username, product_id);
 8   ALTER TABLE ONLY public.cart DROP CONSTRAINT cart_pkey;
       public            postgres    false    224    224            �
           2606    16541    clothing clothing_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public.clothing
    ADD CONSTRAINT clothing_pkey PRIMARY KEY (product_id);
 @   ALTER TABLE ONLY public.clothing DROP CONSTRAINT clothing_pkey;
       public            postgres    false    207            �
           2606    16610    comments comments_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (comment_id);
 @   ALTER TABLE ONLY public.comments DROP CONSTRAINT comments_pkey;
       public            postgres    false    213            �
           2606    16557    notes notes_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (product_id);
 :   ALTER TABLE ONLY public.notes DROP CONSTRAINT notes_pkey;
       public            postgres    false    209            �
           2606    16570    other other_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public.other
    ADD CONSTRAINT other_pkey PRIMARY KEY (product_id);
 :   ALTER TABLE ONLY public.other DROP CONSTRAINT other_pkey;
       public            postgres    false    210            �
           2606    16583 
   pc pc_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public.pc
    ADD CONSTRAINT pc_pkey PRIMARY KEY (product_id);
 4   ALTER TABLE ONLY public.pc DROP CONSTRAINT pc_pkey;
       public            postgres    false    211            �
           2606    16478    product product_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (product_id);
 >   ALTER TABLE ONLY public.product DROP CONSTRAINT product_pkey;
       public            postgres    false    204                       2606    16791    recommender recommender_pkey 
   CONSTRAINT     l   ALTER TABLE ONLY public.recommender
    ADD CONSTRAINT recommender_pkey PRIMARY KEY (username, product_id);
 F   ALTER TABLE ONLY public.recommender DROP CONSTRAINT recommender_pkey;
       public            postgres    false    225    225            �
           2606    16728    requests requests_pkey 
   CONSTRAINT     q   ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (buyer_id, seller_id, product_id);
 @   ALTER TABLE ONLY public.requests DROP CONSTRAINT requests_pkey;
       public            postgres    false    221    221    221            �
           2606    16754    transaction transaction_pkey 
   CONSTRAINT     f   ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_pkey PRIMARY KEY (transaction_id);
 F   ALTER TABLE ONLY public.transaction DROP CONSTRAINT transaction_pkey;
       public            postgres    false    223            �
           2606    16467    user user_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (username);
 :   ALTER TABLE ONLY public."user" DROP CONSTRAINT user_pkey;
       public            postgres    false    202            �
           1259    16806    document_idx    INDEX     K   CREATE INDEX document_idx ON public.product USING gin (document_with_idx);
     DROP INDEX public.document_idx;
       public            postgres    false    204                       2620    16803    product product_t    TRIGGER     n   CREATE TRIGGER product_t AFTER INSERT ON public.product FOR EACH ROW EXECUTE FUNCTION public.insertproduct();
 *   DROP TRIGGER product_t ON public.product;
       public          postgres    false    226    204                       2620    16805    user user_t    TRIGGER     g   CREATE TRIGGER user_t AFTER INSERT ON public."user" FOR EACH ROW EXECUTE FUNCTION public.insertuser();
 &   DROP TRIGGER user_t ON public."user";
       public          postgres    false    227    202                       2606    16516    book book_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.book
    ADD CONSTRAINT book_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;
 C   ALTER TABLE ONLY public.book DROP CONSTRAINT book_product_id_fkey;
       public          postgres    false    205    204    2795                       2606    16529 %   calculator calculator_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.calculator
    ADD CONSTRAINT calculator_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;
 O   ALTER TABLE ONLY public.calculator DROP CONSTRAINT calculator_product_id_fkey;
       public          postgres    false    206    2795    204                       2606    16778    cart cart_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;
 C   ALTER TABLE ONLY public.cart DROP CONSTRAINT cart_product_id_fkey;
       public          postgres    false    2795    204    224                       2606    16773    cart cart_username_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON DELETE CASCADE;
 A   ALTER TABLE ONLY public.cart DROP CONSTRAINT cart_username_fkey;
       public          postgres    false    2792    224    202                       2606    16542 !   clothing clothing_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.clothing
    ADD CONSTRAINT clothing_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;
 K   ALTER TABLE ONLY public.clothing DROP CONSTRAINT clothing_product_id_fkey;
       public          postgres    false    2795    204    207            
           2606    16611 !   comments comments_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;
 K   ALTER TABLE ONLY public.comments DROP CONSTRAINT comments_product_id_fkey;
       public          postgres    false    204    2795    213                       2606    16616    comments comments_username_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON DELETE SET NULL;
 I   ALTER TABLE ONLY public.comments DROP CONSTRAINT comments_username_fkey;
       public          postgres    false    2792    213    202                       2606    16558    notes notes_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;
 E   ALTER TABLE ONLY public.notes DROP CONSTRAINT notes_product_id_fkey;
       public          postgres    false    209    2795    204                       2606    16571    other other_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.other
    ADD CONSTRAINT other_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;
 E   ALTER TABLE ONLY public.other DROP CONSTRAINT other_product_id_fkey;
       public          postgres    false    2795    210    204            	           2606    16584    pc pc_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.pc
    ADD CONSTRAINT pc_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;
 ?   ALTER TABLE ONLY public.pc DROP CONSTRAINT pc_product_id_fkey;
       public          postgres    false    211    204    2795                       2606    16479    product product_buyer_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public."user"(username) ON DELETE SET NULL;
 G   ALTER TABLE ONLY public.product DROP CONSTRAINT product_buyer_id_fkey;
       public          postgres    false    204    202    2792                       2606    16484    product product_seller_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public."user"(username) ON DELETE CASCADE;
 H   ALTER TABLE ONLY public.product DROP CONSTRAINT product_seller_id_fkey;
       public          postgres    false    202    204    2792                       2606    16797 '   recommender recommender_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.recommender
    ADD CONSTRAINT recommender_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;
 Q   ALTER TABLE ONLY public.recommender DROP CONSTRAINT recommender_product_id_fkey;
       public          postgres    false    204    225    2795                       2606    16792 %   recommender recommender_username_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.recommender
    ADD CONSTRAINT recommender_username_fkey FOREIGN KEY (username) REFERENCES public."user"(username) ON DELETE CASCADE;
 O   ALTER TABLE ONLY public.recommender DROP CONSTRAINT recommender_username_fkey;
       public          postgres    false    225    2792    202                       2606    16729    requests requests_buyer_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public."user"(username) ON DELETE CASCADE;
 I   ALTER TABLE ONLY public.requests DROP CONSTRAINT requests_buyer_id_fkey;
       public          postgres    false    202    2792    221                       2606    16739 !   requests requests_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;
 K   ALTER TABLE ONLY public.requests DROP CONSTRAINT requests_product_id_fkey;
       public          postgres    false    2795    221    204                       2606    16734     requests requests_seller_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public."user"(username) ON DELETE CASCADE;
 J   ALTER TABLE ONLY public.requests DROP CONSTRAINT requests_seller_id_fkey;
       public          postgres    false    2792    202    221                       2606    16755 %   transaction transaction_buyer_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public."user"(username) ON DELETE CASCADE;
 O   ALTER TABLE ONLY public.transaction DROP CONSTRAINT transaction_buyer_id_fkey;
       public          postgres    false    223    2792    202                       2606    16760 &   transaction transaction_seller_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public."user"(username) ON DELETE CASCADE;
 P   ALTER TABLE ONLY public.transaction DROP CONSTRAINT transaction_seller_id_fkey;
       public          postgres    false    223    2792    202            �   4   x�3���J��KLIL,�44+��t�H��,.)���S�S�J������� .      �      x������ � �      �      x�+.��,�4�������  �[      �   '   x�3���MM�,��t�H��,.)����,I����� ��	V      �      x������ � �      �      x������ � �      �      x������ � �      �      x������ � �      �   {   x���1� �����h��(kW�	�<���B��z����j�b��LX�Pj�;���Jɞ�j�ڨ%8�!2� }
{n���΃�L]Z=�BNڋ0w<�˟������)׈7��_����8      �   (   x�+.��,�4��4�J�N,� 1M��!��Q3F��� O�      �      x������ � �      �      x������ � �      �   J   x�3�,.��,�L�N,��t,J)����44261������MLO-�/-��M74�076�0343�4��*H����� ��m      �   �   x���=S�0 ��9�
�4I�G7��Bm{E(b9�`c 	B@��^u����{�G*Q� �U?М���v�g�����|m0Hf`d��ŗ�f��S~@F�<�� �W��A��ɮm�͹r�S0�/L�v� ���*���	@8+�L�d�.��]�VTʁk���|W����-��0mU�ޫ$�g�<n��+$��i������籔��O	o���7��5w���h���4��+g>     